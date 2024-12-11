import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const register = async (req, res) => {
    try {
        const {
            userType,
            name: nome,
            email,
            cpf,
            phone: telefone,
            password,
            dataNascimento,
            country: pais,
            state: estado,
            city: cidade,
            zipCode: cep,
            streetAddress: rua,
            number: numero,
            complement: complemento,
            bairro,
            biografia,
        } = req.body;

        // Verificar se o usuário já existe
        const [existingUsers] = await pool.query(
            'SELECT * FROM PESSOAS WHERE email = ? OR cpf = ?',
            [email, cpf],
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email ou CPF já cadastrado.',
            });
        }

        // Iniciar transação
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Hash da senha
            const hashedPassword = await bcrypt.hash(password, 10);

            // Inserir pessoa
            const [personResult] = await connection.query(
                'INSERT INTO PESSOAS (nome, cpf, email, telefone, data_nascimento) VALUES (?, ?, ?, ?, ?)',
                [nome, cpf, email, telefone, dataNascimento],
            );

            // Definir role do usuário
            let role = 'user';
            if (userType === 'guia') {
                role = 'guide';
            } else if (userType === 'admin') {
                // Verificar se quem está criando é admin
                if (!req.user || req.user.role !== 'admin') {
                    throw new Error('Não autorizado a criar usuário admin');
                }
                role = 'admin';
            }

            // Inserir autenticação
            await connection.query(
                'INSERT INTO AUTHS (pessoa_id, password, role) VALUES (?, ?, ?)',
                [personResult.insertId, hashedPassword, role],
            );

            // Se for guia, inserir endereço e registro de guia
            if (userType === 'guia') {
                const [addressResult] = await connection.query(
                    'INSERT INTO ENDERECOS (cep, pais, estado, cidade, bairro, rua, numero, complemento) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        cep,
                        pais,
                        estado,
                        cidade,
                        bairro,
                        rua,
                        numero,
                        complemento,
                    ],
                );

                await connection.query(
                    'INSERT INTO GUIAS (pessoa_id, endereco_id, biografia, status_verificacao) VALUES (?, ?, ?, ?)',
                    [
                        personResult.insertId,
                        addressResult.insertId,
                        biografia || null,
                        'pendente',
                    ],
                );
            }

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Usuário registrado com sucesso',
            });
        } catch (error) {
            await connection.rollback();
            if (error.message === 'Não autorizado a criar usuário admin') {
                return res.status(403).json({
                    success: false,
                    message: error.message,
                });
            }
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar usuário',
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuário com informações completas
        const [users] = await pool.query(
            `SELECT 
                p.*,
                a.password,
                a.role,
                a.is_active,
                CASE 
                    WHEN g.id IS NOT NULL THEN 'guia'
                    ELSE 'viajante'
                END as tipo
            FROM PESSOAS p 
            JOIN AUTHS a ON p.id = a.pessoa_id 
            LEFT JOIN GUIAS g ON p.id = g.pessoa_id
            WHERE p.email = ?`,
            [email],
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos',
            });
        }

        const user = users[0];

        // Verificar se a conta está ativa
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Conta desativada. Entre em contato com o suporte.',
            });
        }

        // Verificar senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos',
            });
        }

        // Atualizar último login
        await pool.query(
            'UPDATE AUTHS SET last_login = CURRENT_TIMESTAMP WHERE pessoa_id = ?',
            [user.id],
        );

        // Gerar token JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                tipo: user.tipo,
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' },
        );

        // Remover dados sensíveis
        delete user.password;
        delete user.is_active;

        res.json({
            success: true,
            token,
            user,
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao realizar login',
        });
    }
};

export const listUsers = async (req, res) => {
    try {
        // Verificar se é admin (dupla verificação)
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message:
                    'Acesso negado. Apenas administradores podem listar usuários.',
            });
        }

        const [users] = await pool.query(`
            SELECT 
                p.id,
                p.nome,
                p.email,
                p.telefone,
                p.cpf,
                p.data_nascimento,
                p.created_at,
                CASE 
                    WHEN g.id IS NOT NULL THEN 'guia'
                    ELSE 'viajante'
                END as tipo,
                a.role,
                a.is_active,
                a.last_login
            FROM PESSOAS p
            JOIN AUTHS a ON p.id = a.pessoa_id
            LEFT JOIN GUIAS g ON p.id = g.pessoa_id
            ORDER BY p.nome
        `);

        // Formatar datas para o padrão brasileiro
        const formattedUsers = users.map((user) => ({
            ...user,
            data_nascimento: user.data_nascimento
                ? new Date(user.data_nascimento).toLocaleDateString('pt-BR')
                : null,
            created_at: new Date(user.created_at).toLocaleString('pt-BR'),
            last_login: user.last_login
                ? new Date(user.last_login).toLocaleString('pt-BR')
                : null,
        }));

        res.json({
            success: true,
            users: formattedUsers,
        });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao recuperar lista de usuários',
        });
    }
};

export const verifyToken = async (req, res) => {
    try {
        const user = req.user;

        // Buscar informações atualizadas do usuário
        const [users] = await pool.query(
            `
            SELECT 
                p.*,
                a.role,
                a.is_active,
                CASE 
                    WHEN g.id IS NOT NULL THEN 'guia'
                    ELSE 'viajante'
                END as tipo
            FROM PESSOAS p
            JOIN AUTHS a ON p.id = a.pessoa_id
            LEFT JOIN GUIAS g ON p.id = g.pessoa_id
            WHERE p.id = ?
        `,
            [user.id],
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado',
            });
        }

        const userData = users[0];

        // Remover dados sensíveis
        delete userData.password;

        res.json({
            success: true,
            user: userData,
        });
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        res.status(401).json({
            success: false,
            message: 'Token inválido ou expirado',
        });
    }
};

export const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const requestingUser = req.user;

        if (requestingUser.id.toString() !== userId && requestingUser.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Você só pode visualizar seu próprio perfil.'
            });
        }

        // Query atualizada removendo biografia da tabela GUIA
        const [users] = await pool.query(`
            SELECT 
                p.*,   -- Agora inclui a biografia da tabela PESSOA
                a.role,
                a.is_active,
                CASE 
                    WHEN g.id IS NOT NULL THEN 'guia'
                    ELSE 'viajante'
                END as tipo,
                g.anos_experiencia,
                g.avaliacao_media,
                g.numero_avaliacoes,
                g.status_verificacao,
                e.cep,
                e.pais,
                e.estado,
                e.cidade,
                e.bairro,
                e.rua,
                e.numero as endereco_numero,
                e.complemento
            FROM PESSOAS p
            JOIN AUTHS a ON p.id = a.pessoa_id
            LEFT JOIN GUIAS g ON p.id = g.pessoa_id
            LEFT JOIN ENDERECOS e ON g.endereco_id = e.id
            WHERE p.id = ?
        `, [userId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        const userData = users[0];
        delete userData.password;

        // Formatar datas
        userData.data_nascimento = userData.data_nascimento
            ? new Date(userData.data_nascimento).toLocaleDateString('pt-BR')
            : null;
        userData.created_at = new Date(userData.created_at).toLocaleString('pt-BR');
        userData.updated_at = userData.updated_at
            ? new Date(userData.updated_at).toLocaleString('pt-BR')
            : null;

        res.json({
            success: true,
            user: userData
        });
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao recuperar informações do usuário'
        });
    }
};

export const updateUser = async (req, res) => {
    try {
        const requestingUser = req.user;
        const updates = req.body;

        // Verificar se o usuário existe
        const [userCheck] = await pool.query(
            'SELECT p.id, p.email FROM PESSOAS p WHERE p.id = ?',
            [requestingUser.id],
        );

        if (userCheck.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuário não encontrado',
            });
        }

        // Iniciar transação
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Atualizar tabela PESSOA
            if (
                Object.keys(updates).some((key) =>
                    [
                        'nome',
                        'telefone',
                        'data_nascimento',
                        'biografia',
                    ].includes(key),
                )
            ) {
                const updateFields = [];
                const updateValues = [];

                if (updates.nome !== undefined) {
                    updateFields.push('nome = ?');
                    updateValues.push(updates.nome);
                }
                if (updates.telefone !== undefined) {
                    updateFields.push('telefone = ?');
                    updateValues.push(updates.telefone);
                }
                if (updates.data_nascimento !== undefined) {
                    updateFields.push('data_nascimento = ?');
                    updateValues.push(updates.data_nascimento);
                }
                if (updates.biografia !== undefined) {
                    updateFields.push('biografia = ?');
                    updateValues.push(updates.biografia);
                }

                if (updateFields.length > 0) {
                    updateValues.push(requestingUser.id);
                    await connection.query(
                        `UPDATE PESSOAS SET ${updateFields.join(
                            ', ',
                        )} WHERE id = ?`,
                        updateValues,
                    );
                }
            }

            // Verificar e atualizar informações de guia
            const [guiaCheck] = await connection.query(
                'SELECT id, endereco_id FROM GUIAS WHERE pessoa_id = ?',
                [requestingUser.id],
            );

            // Se for guia, atualizar biografia e endereço
            if (guiaCheck.length > 0) {
                // Atualizar biografia se fornecida
                if (updates.biografia !== undefined) {
                    await connection.query(
                        'UPDATE GUIAS SET biografia = ? WHERE pessoa_id = ?',
                        [updates.biografia, requestingUser.id],
                    );
                }

                // Atualizar endereço se fornecido
                if (updates.endereco) {
                    const endereco = updates.endereco;
                    const enderecoId = guiaCheck[0].endereco_id;

                    const enderecoFields = [];
                    const enderecoValues = [];

                    const enderecoUpdates = {
                        cep: endereco.cep,
                        pais: endereco.pais,
                        estado: endereco.estado,
                        cidade: endereco.cidade,
                        bairro: endereco.bairro,
                        rua: endereco.rua,
                        numero: endereco.numero,
                        complemento: endereco.complemento,
                    };

                    Object.entries(enderecoUpdates).forEach(([key, value]) => {
                        if (value !== undefined) {
                            enderecoFields.push(`${key} = ?`);
                            enderecoValues.push(value);
                        }
                    });

                    if (enderecoFields.length > 0) {
                        enderecoValues.push(enderecoId);
                        await connection.query(
                            `UPDATE ENDERECOS SET ${enderecoFields.join(
                                ', ',
                            )} WHERE id = ?`,
                            enderecoValues,
                        );
                    }
                }
            }

            await connection.commit();

            // Buscar dados atualizados
            const [updatedUser] = await connection.query(
                `
    SELECT 
        p.*,
        a.role,
        CASE 
            WHEN g.id IS NOT NULL THEN 'guia'
            ELSE 'viajante'
        END as tipo,
        g.status_verificacao,
        e.cep,
        e.pais,
        e.estado,
        e.cidade,
        e.bairro,
        e.rua,
        e.numero as endereco_numero,
        e.complemento
    FROM PESSOAS p
    JOIN AUTHS a ON p.id = a.pessoa_id
    LEFT JOIN GUIAS g ON p.id = g.pessoa_id
    LEFT JOIN ENDERECOS e ON g.endereco_id = e.id
    WHERE p.id = ?
`,
                [requestingUser.id],
            );

            if (updatedUser.length === 0) {
                throw new Error('Erro ao recuperar dados atualizados');
            }

            const userData = updatedUser[0];
            delete userData.password;

            res.json({
                success: true,
                message: 'Perfil atualizado com sucesso',
                user: userData,
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar informações do usuário',
        });
    }
};
