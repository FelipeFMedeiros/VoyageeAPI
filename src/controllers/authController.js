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
            biografia
        } = req.body;

        // Verificar se o usuário já existe
        const [existingUsers] = await pool.query(
            'SELECT * FROM PESSOA WHERE email = ? OR cpf = ?',
            [email, cpf]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email ou CPF já cadastrado.'
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
                'INSERT INTO PESSOA (nome, cpf, email, telefone, data_nascimento) VALUES (?, ?, ?, ?, ?)',
                [nome, cpf, email, telefone, dataNascimento]
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
                'INSERT INTO AUTH (pessoa_id, password, role) VALUES (?, ?, ?)',
                [personResult.insertId, hashedPassword, role]
            );

            // Se for guia, inserir endereço e registro de guia
            if (userType === 'guia') {
                const [addressResult] = await connection.query(
                    'INSERT INTO ENDERECO (cep, pais, estado, cidade, bairro, rua, numero, complemento) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [cep, pais, estado, cidade, bairro, rua, numero, complemento]
                );

                await connection.query(
                    'INSERT INTO GUIA (pessoa_id, endereco_id, biografia, status_verificacao) VALUES (?, ?, ?, ?)',
                    [personResult.insertId, addressResult.insertId, biografia || null, 'pendente']
                );
            }

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Usuário registrado com sucesso'
            });
        } catch (error) {
            await connection.rollback();
            if (error.message === 'Não autorizado a criar usuário admin') {
                return res.status(403).json({
                    success: false,
                    message: error.message
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
            message: 'Erro ao registrar usuário'
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
            FROM PESSOA p 
            JOIN AUTH a ON p.id = a.pessoa_id 
            LEFT JOIN GUIA g ON p.id = g.pessoa_id
            WHERE p.email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        const user = users[0];

        // Verificar se a conta está ativa
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Conta desativada. Entre em contato com o suporte.'
            });
        }

        // Verificar senha
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Atualizar último login
        await pool.query(
            'UPDATE AUTH SET last_login = CURRENT_TIMESTAMP WHERE pessoa_id = ?',
            [user.id]
        );

        // Gerar token JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                tipo: user.tipo
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remover dados sensíveis
        delete user.password;
        delete user.is_active;

        res.json({
            success: true,
            token,
            user
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao realizar login'
        });
    }
};

export const listUsers = async (req, res) => {
    try {
        // Verificar se é admin (dupla verificação)
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado. Apenas administradores podem listar usuários.'
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
            FROM PESSOA p
            JOIN AUTH a ON p.id = a.pessoa_id
            LEFT JOIN GUIA g ON p.id = g.pessoa_id
            ORDER BY p.nome
        `);

        // Formatar datas para o padrão brasileiro
        const formattedUsers = users.map(user => ({
            ...user,
            data_nascimento: user.data_nascimento ? new Date(user.data_nascimento).toLocaleDateString('pt-BR') : null,
            created_at: new Date(user.created_at).toLocaleString('pt-BR'),
            last_login: user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : null
        }));

        res.json({
            success: true,
            users: formattedUsers
        });
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao recuperar lista de usuários'
        });
    }
};

export const verifyToken = async (req, res) => {
    try {
        const user = req.user;
        
        // Buscar informações atualizadas do usuário
        const [users] = await pool.query(`
            SELECT 
                p.*,
                a.role,
                a.is_active,
                CASE 
                    WHEN g.id IS NOT NULL THEN 'guia'
                    ELSE 'viajante'
                END as tipo
            FROM PESSOA p
            JOIN AUTH a ON p.id = a.pessoa_id
            LEFT JOIN GUIA g ON p.id = g.pessoa_id
            WHERE p.id = ?
        `, [user.id]);

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }

        const userData = users[0];

        // Remover dados sensíveis
        delete userData.password;

        res.json({
            success: true,
            user: userData
        });
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        res.status(401).json({
            success: false,
            message: 'Token inválido ou expirado'
        });
    }
};