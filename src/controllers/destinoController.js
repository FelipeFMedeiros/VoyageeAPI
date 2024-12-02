import pool from '../config/database.js';

export const createDestino = async (req, res) => {
    try {
        const { 
            nome, 
            estado, 
            cidade, 
            descricao, 
            latitude, 
            longitude 
        } = req.body;

        // Validar estado (UF)
        if (estado.length !== 2) {
            return res.status(400).json({
                success: false,
                message: 'O estado deve ser uma UF válida com 2 caracteres'
            });
        }

        // Verificar se o destino já existe
        const [existingDestinos] = await pool.query(
            'SELECT id FROM DESTINO WHERE nome = ? AND cidade = ? AND estado = ?',
            [nome, cidade, estado]
        );

        if (existingDestinos.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Já existe um destino com este nome nesta cidade'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO DESTINO (nome, estado, cidade, descricao, latitude, longitude)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nome, estado.toUpperCase(), cidade, descricao, latitude, longitude]
        );

        const [destino] = await pool.query(
            'SELECT * FROM DESTINO WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Destino criado com sucesso',
            destino: destino[0]
        });

    } catch (error) {
        console.error('Erro ao criar destino:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar destino'
        });
    }
};

export const listDestinos = async (req, res) => {
    try {
        const { estado, cidade } = req.query;
        
        let query = 'SELECT * FROM DESTINO WHERE 1=1';
        const queryParams = [];

        if (estado) {
            query += ' AND estado = ?';
            queryParams.push(estado.toUpperCase());
        }

        if (cidade) {
            query += ' AND cidade LIKE ?';
            queryParams.push(`%${cidade}%`);
        }

        query += ' ORDER BY estado, cidade, nome';

        const [destinos] = await pool.query(query, queryParams);

        res.json({
            success: true,
            destinos
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
            [id]
        );

        if (destinos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Destino não encontrado'
            });
        }

        res.json({
            success: true,
            destino: destinos[0]
        });

    } catch (error) {
        console.error('Erro ao buscar destino:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar destino'
        });
    }
};

export const updateDestino = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Verificar se o destino existe
        const [destinos] = await pool.query(
            'SELECT id FROM DESTINO WHERE id = ?',
            [id]
        );

        if (destinos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Destino não encontrado'
            });
        }

        // Validar estado se fornecido
        if (updates.estado && updates.estado.length !== 2) {
            return res.status(400).json({
                success: false,
                message: 'O estado deve ser uma UF válida com 2 caracteres'
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
            longitude: updates.longitude
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
                updateValues
            );
        }

        // Buscar destino atualizado
        const [destinoAtualizado] = await pool.query(
            'SELECT * FROM DESTINO WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: 'Destino atualizado com sucesso',
            destino: destinoAtualizado[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar destino:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar destino'
        });
    }
};

export const deleteDestino = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar se o destino existe
        const [destinos] = await pool.query(
            'SELECT id FROM DESTINO WHERE id = ?',
            [id]
        );

        if (destinos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Destino não encontrado'
            });
        }

        // Verificar se existem passeios vinculados
        const [passeios] = await pool.query(
            'SELECT id FROM PASSEIO WHERE destino_id = ?',
            [id]
        );

        if (passeios.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível excluir o destino pois existem passeios vinculados'
            });
        }

        await pool.query('DELETE FROM DESTINO WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Destino removido com sucesso'
        });

    } catch (error) {
        console.error('Erro ao deletar destino:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar destino'
        });
    }
};