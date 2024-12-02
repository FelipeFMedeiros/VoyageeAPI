import pool from '../config/database.js';

export const createPasseio = async (req, res) => {
    try {
        const {
            nome,
            descricao,
            preco,
            destino_id,
            duracao_horas,
            nivel_dificuldade,
            inclui_refeicao,
            inclui_transporte,
            capacidade_maxima
        } = req.body;
        const guia_id = req.user.id;

        // Verificar se o usuário é um guia
        const [guias] = await pool.query(
            'SELECT id FROM GUIA WHERE pessoa_id = ?',
            [guia_id]
        );

        if (guias.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Apenas guias podem criar passeios'
            });
        }

        // Verificar se o destino existe
        const [destinos] = await pool.query(
            'SELECT id FROM DESTINO WHERE id = ?',
            [destino_id]
        );

        if (destinos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Destino não encontrado'
            });
        }

        // Criar passeio
        const [result] = await pool.query(
            `INSERT INTO PASSEIO (
                nome, descricao, preco, destino_id, guia_id,
                duracao_horas, nivel_dificuldade, inclui_refeicao,
                inclui_transporte, capacidade_maxima
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nome, descricao, preco, destino_id, guias[0].id,
             duracao_horas, nivel_dificuldade, inclui_refeicao,
             inclui_transporte, capacidade_maxima]
        );

        // Buscar passeio criado com todas as informações
        const [passeio] = await pool.query(`
            SELECT 
                p.*,
                d.nome as destino_nome,
                d.cidade,
                d.estado,
                ps.nome as guia_nome,
                ps.email as guia_email
            FROM PASSEIO p
            JOIN DESTINO d ON p.destino_id = d.id
            JOIN GUIA g ON p.guia_id = g.id
            JOIN PESSOA ps ON g.pessoa_id = ps.id
            WHERE p.id = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Passeio criado com sucesso',
            passeio: passeio[0]
        });

    } catch (error) {
        console.error('Erro ao criar passeio:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar passeio'
        });
    }
};

export const listPasseios = async (req, res) => {
    try {
        const { destino_id, guia_id, nivel_dificuldade, preco_min, preco_max } = req.query;

        let query = `
            SELECT 
                p.*,
                d.nome as destino_nome,
                d.cidade,
                d.estado,
                ps.nome as guia_nome,
                ps.email as guia_email
            FROM PASSEIO p
            JOIN DESTINO d ON p.destino_id = d.id
            JOIN GUIA g ON p.guia_id = g.id
            JOIN PESSOA ps ON g.pessoa_id = ps.id
            WHERE 1=1
        `;
        const queryParams = [];

        if (destino_id) {
            query += ' AND p.destino_id = ?';
            queryParams.push(destino_id);
        }

        if (guia_id) {
            query += ' AND p.guia_id = ?';
            queryParams.push(guia_id);
        }

        if (nivel_dificuldade) {
            query += ' AND p.nivel_dificuldade = ?';
            queryParams.push(nivel_dificuldade);
        }

        if (preco_min) {
            query += ' AND p.preco >= ?';
            queryParams.push(preco_min);
        }

        if (preco_max) {
            query += ' AND p.preco <= ?';
            queryParams.push(preco_max);
        }

        const [passeios] = await pool.query(query, queryParams);

        res.json({
            success: true,
            passeios
        });

    } catch (error) {
        console.error('Erro ao listar passeios:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar passeios'
        });
    }
};

export const getPasseioById = async (req, res) => {
    try {
        const { id } = req.params;

        const [passeios] = await pool.query(`
            SELECT 
                p.*,
                d.nome as destino_nome,
                d.cidade,
                d.estado,
                d.latitude,
                d.longitude,
                ps.nome as guia_nome,
                ps.email as guia_email
            FROM PASSEIO p
            JOIN DESTINO d ON p.destino_id = d.id
            JOIN GUIA g ON p.guia_id = g.id
            JOIN PESSOA ps ON g.pessoa_id = ps.id
            WHERE p.id = ?
        `, [id]);

        if (passeios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Passeio não encontrado'
            });
        }

        res.json({
            success: true,
            passeio: passeios[0]
        });

    } catch (error) {
        console.error('Erro ao buscar passeio:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar passeio'
        });
    }
};

export const updatePasseio = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const updates = req.body;

        // Verificar se o passeio existe e se o usuário é o guia do passeio
        const [passeios] = await pool.query(`
            SELECT p.* FROM PASSEIO p
            JOIN GUIA g ON p.guia_id = g.id
            WHERE p.id = ? AND g.pessoa_id = ?
        `, [id, userId]);

        if (passeios.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado ou passeio não encontrado'
            });
        }

        // Construir query de atualização dinamicamente
        const updateFields = [];
        const updateValues = [];

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                updateFields.push(`${key} = ?`);
                updateValues.push(value);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum campo para atualizar'
            });
        }

        updateValues.push(id);

        await pool.query(
            `UPDATE PASSEIO SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        // Buscar passeio atualizado
        const [passeioAtualizado] = await pool.query(`
            SELECT 
                p.*,
                d.nome as destino_nome,
                d.cidade,
                d.estado,
                ps.nome as guia_nome,
                ps.email as guia_email
            FROM PASSEIO p
            JOIN DESTINO d ON p.destino_id = d.id
            JOIN GUIA g ON p.guia_id = g.id
            JOIN PESSOA ps ON g.pessoa_id = ps.id
            WHERE p.id = ?
        `, [id]);

        res.json({
            success: true,
            message: 'Passeio atualizado com sucesso',
            passeio: passeioAtualizado[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar passeio:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar passeio'
        });
    }
};

export const deletePasseio = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar se o passeio existe e se o usuário é o guia do passeio
        const [passeios] = await pool.query(`
            SELECT p.* FROM PASSEIO p
            JOIN GUIA g ON p.guia_id = g.id
            WHERE p.id = ? AND g.pessoa_id = ?
        `, [id, userId]);

        if (passeios.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Acesso negado ou passeio não encontrado'
            });
        }

        // Verificar se existem roteiros associados
        const [roteiros] = await pool.query(
            'SELECT id FROM ROTEIRO WHERE passeio_id = ?',
            [id]
        );

        if (roteiros.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Não é possível excluir um passeio que possui roteiros'
            });
        }

        // Excluir passeio
        await pool.query('DELETE FROM PASSEIO WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Passeio removido com sucesso'
        });

    } catch (error) {
        console.error('Erro ao excluir passeio:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir passeio'
        });
    }
};