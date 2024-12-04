import pool from '../config/database.js';

export const createDestino = async (req, res) => {
    try {
        const { nome, estado, cidade, descricao, latitude, longitude } = req.body;
        const user_id = req.user.id;

        // Validar estado (UF)
        if (estado.length !== 2) {
            return res.status(400).json({
                success: false,
                message: 'O estado deve ser uma UF válida com 2 caracteres',
            });
        }

        // Verificar se o destino já existe
        const [existingDestinos] = await pool.query(
            'SELECT id FROM DESTINO WHERE nome = ? AND cidade = ? AND estado = ?',
            [nome, cidade, estado],
        );

        if (existingDestinos.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Já existe um destino com este nome nesta cidade',
            });
        }

        // Inserir destino com latitude e longitude opcionais
        const [result] = await pool.query(
            `INSERT INTO DESTINO (nome, estado, cidade, descricao, latitude, longitude, user_id)
             VALUES (?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?)`,
            [
                nome,
                estado.toUpperCase(),
                cidade,
                descricao,
                latitude || null,
                longitude || null,
                user_id,
            ],
        );

        const [destino] = await pool.query(
            'SELECT * FROM DESTINO WHERE id = ?',
            [result.insertId],
        );

        res.status(201).json({
            success: true,
            message: 'Destino criado com sucesso',
            destino: destino[0],
        });
    } catch (error) {
        console.error('Erro ao criar destino:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar destino',
        });
    }
};

export const listDestinos = async (req, res) => {
    try {
        const { estado, cidade, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Base query para WHERE conditions
        let conditions = '1=1';
        const queryParams = [];

        if (estado) {
            conditions += ' AND d.estado = ?';
            queryParams.push(estado.toUpperCase());
        }

        if (cidade) {
            conditions += ' AND d.cidade LIKE ?';
            queryParams.push(`%${cidade}%`);
        }

        // Query para contar total de registros
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM DESTINO d
            JOIN PESSOA p ON d.user_id = p.id
            LEFT JOIN GUIA g ON p.id = g.pessoa_id
            WHERE ${conditions}
        `;
        
        const [totalCount] = await pool.query(countQuery, queryParams);
        const total = totalCount[0].total;
        const totalPages = Math.ceil(total / parseInt(limit));

        // Query principal com todos os campos
        const query = `
            SELECT 
                d.*,
                p.nome as criador_nome,
                p.email as criador_email,
                CASE 
                    WHEN g.id IS NOT NULL THEN true 
                    ELSE false 
                END as criador_eh_guia,
                (SELECT COUNT(*) FROM PASSEIO WHERE destino_id = d.id) as total_passeios
            FROM DESTINO d
            JOIN PESSOA p ON d.user_id = p.id
            LEFT JOIN GUIA g ON p.id = g.pessoa_id
            WHERE ${conditions}
            ORDER BY d.estado, d.cidade, d.nome
            LIMIT ? OFFSET ?
        `;

        // Adicionar parâmetros de paginação
        const queryParamsWithPagination = [...queryParams, parseInt(limit), offset];

        const [destinos] = await pool.query(query, queryParamsWithPagination);

        res.json({
            success: true,
            destinos,
            pagination: {
                total,
                totalPages,
                currentPage: parseInt(page),
                limit: parseInt(limit),
                hasNext: parseInt(page) < totalPages,
                hasPrevious: parseInt(page) > 1
            }
        });
    } catch (error) {
        console.error('Erro ao listar destinos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar destinos'
        });
    }
};

export const getDestinoById = async (req, res) => {
    try {
        const { id } = req.params;

        const [destinos] = await pool.query(
            'SELECT * FROM DESTINO WHERE id = ?',
            [id],
        );

        if (destinos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Destino não encontrado',
            });
        }

        res.json({
            success: true,
            destino: destinos[0],
        });
    } catch (error) {
        console.error('Erro ao buscar destino:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar destino',
        });
    }
};

export const updateDestino = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const user_id = req.user.id;
        const isAdmin = req.user.role === 'admin';

        // Verificar se o destino existe
        const [destinos] = await pool.query(
            'SELECT id, user_id FROM DESTINO WHERE id = ?',
            [id],
        );

        if (destinos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Destino não encontrado',
            });
        }

        // Verificar se o usuário tem permissão para editar
        if (!isAdmin && destinos[0].user_id !== user_id) {
            return res.status(403).json({
                success: false,
                message: 'Você não tem permissão para editar este destino',
            });
        }

        // Validar estado se fornecido
        if (updates.estado && updates.estado.length !== 2) {
            return res.status(400).json({
                success: false,
                message: 'O estado deve ser uma UF válida com 2 caracteres',
            });
        }

        const updateFields = [];
        const updateValues = [];

        Object.entries({
            nome: updates.nome,
            estado: updates.estado?.toUpperCase(),
            cidade: updates.cidade,
            descricao: updates.descricao,
            latitude: updates.latitude,
            longitude: updates.longitude,
        }).forEach(([key, value]) => {
            if (value !== undefined) {
                updateFields.push(`${key} = ?`);
                updateValues.push(value);
            }
        });

        if (updateFields.length > 0) {
            updateValues.push(id);
            await pool.query(
                `UPDATE DESTINO SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues,
            );
        }

        // Buscar destino atualizado
        const [destinoAtualizado] = await pool.query(
            'SELECT * FROM DESTINO WHERE id = ?',
            [id],
        );

        res.json({
            success: true,
            message: 'Destino atualizado com sucesso',
            destino: destinoAtualizado[0],
        });
    } catch (error) {
        console.error('Erro ao atualizar destino:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar destino',
        });
    }
};

export const deleteDestino = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        // Verificar se o destino existe e pegar informações do criador
        const [destinos] = await pool.query(
            'SELECT id, user_id FROM DESTINO WHERE id = ?',
            [id],
        );

        if (destinos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Destino não encontrado',
            });
        }

        // Verificar se o usuário tem permissão para excluir
        if (!isAdmin && destinos[0].user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Apenas o criador ou um administrador pode excluir este destino',
            });
        }

        // Verificar se existem passeios vinculados
        const [passeios] = await pool.query(
            'SELECT id FROM PASSEIO WHERE destino_id = ?',
            [id],
        );

        if (passeios.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível excluir o destino pois existem passeios vinculados',
            });
        }

        await pool.query('DELETE FROM DESTINO WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Destino removido com sucesso',
        });
    } catch (error) {
        console.error('Erro ao deletar destino:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar destino',
        });
    }
};

export const getUserDestinos = async (req, res) => {
    try {
        const userId = req.params.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const estado = req.query.estado;
        const cidade = req.query.cidade;

        // Construir a query base
        let query = `
            SELECT 
                d.*,
                p.nome as criador_nome,
                p.email as criador_email,
                CASE 
                    WHEN g.id IS NOT NULL THEN true 
                    ELSE false 
                END as criador_eh_guia,
                (SELECT COUNT(*) FROM PASSEIO WHERE destino_id = d.id) as total_passeios
            FROM DESTINO d
            JOIN PESSOA p ON d.user_id = p.id
            LEFT JOIN GUIA g ON p.id = g.pessoa_id
            WHERE d.user_id = ?
        `;

        const queryParams = [userId];

        if (estado) {
            query += ' AND d.estado = ?';
            queryParams.push(estado.toUpperCase());
        }

        if (cidade) {
            query += ' AND d.cidade LIKE ?';
            queryParams.push(`%${cidade}%`);
        }

        // Adicionar ordenação
        query += ' ORDER BY d.created_at DESC';

        // Adicionar paginação
        query += ' LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        // Executar query principal
        const [destinos] = await pool.query(query, queryParams);

        // Buscar contagem total para paginação
        const [totalCount] = await pool.query(
            `SELECT COUNT(*) as total 
             FROM DESTINO 
             WHERE user_id = ?
             ${estado ? 'AND estado = ?' : ''}
             ${cidade ? 'AND cidade LIKE ?' : ''}`,
            queryParams.slice(0, -2) // Remove os parâmetros de LIMIT e OFFSET
        );

        const total = totalCount[0].total;
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            destinos,
            pagination: {
                total,
                totalPages,
                currentPage: page,
                limit,
                hasNext: page < totalPages,
                hasPrevious: page > 1
            }
        });
    } catch (error) {
        console.error('Erro ao buscar destinos do usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar destinos do usuário'
        });
    }
};