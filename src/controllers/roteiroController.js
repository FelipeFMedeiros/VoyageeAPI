import pool from '../config/database.js';

export const createRoteiro = async (req, res) => {
    try {
        const { passeioId, data, horaInicio, horaFim, vagasDisponiveis } =
            req.body;

        if (
            !passeioId ||
            !data ||
            !horaInicio ||
            !horaFim ||
            !vagasDisponiveis
        ) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos obrigatórios devem ser preenchidos',
            });
        }

        const userId = req.user.id;

        // Verificar se o passeio existe
        const [passeios] = await pool.query(
            'SELECT id, destino_id, guia_id FROM PASSEIO WHERE id = ?',
            [passeioId],
        );

        if (passeios.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Passeio não encontrado',
            });
        }

        // Iniciar transação
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Criar roteiro
            const [result] = await connection.query(
                `INSERT INTO ROTEIRO (
                    passeio_id, data, hora_inicio, hora_fim, 
                    status, vagas_disponiveis, criador_id
                ) VALUES (?, ?, ?, ?, 'agendado', ?, ?)`,
                [
                    passeioId,
                    data,
                    horaInicio,
                    horaFim,
                    vagasDisponiveis,
                    userId,
                ],
            );

            await connection.commit();

            // Buscar roteiro criado com todas as informações
            const [roteiro] = await pool.query(
                `
                SELECT 
                    r.*,
                    p.nome as passeio_nome,
                    p.descricao as passeio_descricao,
                    p.preco,
                    p.duracao_horas,
                    p.nivel_dificuldade,
                    p.inclui_refeicao,
                    p.inclui_transporte,
                    p.capacidade_maxima,
                    d.nome as destino_nome,
                    d.cidade,
                    d.estado,
                    d.latitude,
                    d.longitude,
                    g.id as guia_id,
                    ps.nome as guia_nome,
                    ps.email as guia_email,
                    pc.nome as criador_nome,
                    COALESCE(ar.media_avaliacoes, 0) as avaliacao_media,
                    COALESCE(ar.total_avaliacoes, 0) as total_avaliacoes
                FROM ROTEIRO r
                JOIN PASSEIO p ON r.passeio_id = p.id
                JOIN DESTINO d ON p.destino_id = d.id
                JOIN GUIA g ON p.guia_id = g.id
                JOIN PESSOA ps ON g.pessoa_id = ps.id
                JOIN PESSOA pc ON r.criador_id = pc.id
                LEFT JOIN (
                    SELECT 
                        roteiro_id,
                        AVG(nota) as media_avaliacoes,
                        COUNT(*) as total_avaliacoes
                    FROM AVALIACAO_ROTEIRO
                    GROUP BY roteiro_id
                ) ar ON r.id = ar.roteiro_id
                WHERE r.id = ?
            `,
                [result.insertId],
            );

            res.status(201).json({
                success: true,
                message: 'Roteiro criado com sucesso',
                roteiro: roteiro[0],
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Erro ao criar roteiro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar roteiro',
        });
    }
};

export const listRoteiros = async (req, res) => {
    try {
        const { status, data, destino, guiaId } = req.query;

        let query = `
            SELECT 
                r.*,
                p.nome as passeio_nome,
                p.descricao as passeio_descricao,
                p.preco,
                p.duracao_horas,
                p.nivel_dificuldade,
                p.inclui_refeicao,
                p.inclui_transporte,
                d.nome as destino_nome,
                d.cidade,
                d.estado,
                g.id as guia_id,
                ps.nome as guia_nome,
                pc.nome as criador_nome,
                COALESCE(ar.media_avaliacoes, 0) as avaliacao_media,
                COALESCE(ar.total_avaliacoes, 0) as total_avaliacoes
            FROM ROTEIRO r
            JOIN PASSEIO p ON r.passeio_id = p.id
            JOIN DESTINO d ON p.destino_id = d.id
            JOIN GUIA g ON p.guia_id = g.id
            JOIN PESSOA ps ON g.pessoa_id = ps.id
            JOIN PESSOA pc ON r.criador_id = pc.id
            LEFT JOIN (
                SELECT 
                    roteiro_id,
                    AVG(nota) as media_avaliacoes,
                    COUNT(*) as total_avaliacoes
                FROM AVALIACAO_ROTEIRO
                GROUP BY roteiro_id
            ) ar ON r.id = ar.roteiro_id
            WHERE 1=1
        `;
        const queryParams = [];

        if (status) {
            query += ' AND r.status = ?';
            queryParams.push(status);
        }

        if (data) {
            query += ' AND r.data = ?';
            queryParams.push(data);
        }

        if (destino) {
            query += ' AND d.id = ?';
            queryParams.push(destino);
        }

        if (guiaId) {
            query += ' AND g.id = ?';
            queryParams.push(guiaId);
        }

        query += ' ORDER BY r.data ASC, r.hora_inicio ASC';

        const [roteiros] = await pool.query(query, queryParams);

        res.json({
            success: true,
            roteiros,
        });
    } catch (error) {
        console.error('Erro ao listar roteiros:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao listar roteiros',
        });
    }
};

export const getRoteiroById = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar roteiro com todas as informações relacionadas
        const [roteiros] = await pool.query(
            `
                SELECT 
                    r.*,
                    p.nome as passeio_nome,
                    p.descricao as passeio_descricao,
                    p.preco,
                    p.duracao_horas,
                    p.nivel_dificuldade,
                    p.inclui_refeicao,
                    p.inclui_transporte,
                    p.capacidade_maxima,
                    d.nome as destino_nome,
                    d.cidade,
                    d.estado,
                    d.descricao as destino_descricao,
                    d.latitude,
                    d.longitude,
                    g.id as guia_id,
                    ps.nome as guia_nome,
                    ps.email as guia_email,
                    pc.nome as criador_nome,
                    pc.email as criador_email,
                    COALESCE(ar.media_avaliacoes, 0) as avaliacao_media,
                    COALESCE(ar.total_avaliacoes, 0) as total_avaliacoes
                FROM ROTEIRO r
                JOIN PASSEIO p ON r.passeio_id = p.id
                JOIN DESTINO d ON p.destino_id = d.id
                JOIN GUIA g ON p.guia_id = g.id
                JOIN PESSOA ps ON g.pessoa_id = ps.id
                JOIN PESSOA pc ON r.criador_id = pc.id
                LEFT JOIN (
                    SELECT 
                        roteiro_id,
                        AVG(nota) as media_avaliacoes,
                        COUNT(*) as total_avaliacoes
                    FROM AVALIACAO_ROTEIRO
                    GROUP BY roteiro_id
                ) ar ON r.id = ar.roteiro_id
                WHERE r.id = ?
            `,
            [id],
        );

        if (roteiros.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Roteiro não encontrado',
            });
        }

        // Buscar as últimas avaliações do roteiro
        const [avaliacoes] = await pool.query(
            `
                SELECT 
                    ar.nota,
                    ar.comentario,
                    ar.created_at,
                    p.nome as avaliador_nome
                FROM AVALIACAO_ROTEIRO ar
                JOIN PESSOA p ON ar.usuario_id = p.id
                WHERE ar.roteiro_id = ?
                ORDER BY ar.created_at DESC
                LIMIT 5
            `,
            [id],
        );

        // Formatar o roteiro com as avaliações
        const roteiro = {
            ...roteiros[0],
            avaliacoes: avaliacoes,
        };

        res.json({
            success: true,
            roteiro,
        });
    } catch (error) {
        console.error('Erro ao buscar roteiro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar roteiro',
        });
    }
};

export const avaliarRoteiro = async (req, res) => {
    try {
        const { roteiroId } = req.params;
        const { nota, comentario } = req.body;
        const userId = req.user.id;

        // Validar nota
        if (nota < 0 || nota > 5) {
            return res.status(400).json({
                success: false,
                message: 'A nota deve estar entre 0 e 5',
            });
        }

        // Verificar se o roteiro existe e está concluído
        const [roteiros] = await pool.query(
            'SELECT status FROM ROTEIRO WHERE id = ?',
            [roteiroId],
        );

        if (roteiros.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Roteiro não encontrado',
            });
        }

        if (roteiros[0].status !== 'concluido') {
            return res.status(400).json({
                success: false,
                message: 'Apenas roteiros concluídos podem ser avaliados',
            });
        }

        // Verificar se o usuário já avaliou este roteiro
        const [avaliacaoExistente] = await pool.query(
            'SELECT id FROM AVALIACAO_ROTEIRO WHERE roteiro_id = ? AND usuario_id = ?',
            [roteiroId, userId],
        );

        if (avaliacaoExistente.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Você já avaliou este roteiro',
            });
        }

        // Iniciar transação
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Criar avaliação
            await connection.query(
                'INSERT INTO AVALIACAO_ROTEIRO (roteiro_id, usuario_id, nota, comentario) VALUES (?, ?, ?, ?)',
                [roteiroId, userId, nota, comentario],
            );

            // Buscar média atualizada
            const [mediaAvaliacoes] = await connection.query(
                `
                    SELECT 
                        AVG(nota) as media,
                        COUNT(*) as total
                    FROM AVALIACAO_ROTEIRO
                    WHERE roteiro_id = ?
                `,
                [roteiroId],
            );

            await connection.commit();

            res.json({
                success: true,
                message: 'Avaliação registrada com sucesso',
                avaliacao: {
                    media: parseFloat(mediaAvaliacoes[0].media).toFixed(1),
                    total_avaliacoes: mediaAvaliacoes[0].total,
                },
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Erro ao avaliar roteiro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar avaliação',
        });
    }
};

export const updateRoteiro = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, horaInicio, horaFim, status, vagasDisponiveis } =
            req.body;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        // Verificar se o roteiro existe
        const [roteiros] = await pool.query(
            'SELECT * FROM ROTEIRO WHERE id = ?',
            [id],
        );

        if (roteiros.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Roteiro não encontrado',
            });
        }

        const roteiro = roteiros[0];

        // Verificar se o usuário tem permissão (admin ou criador)
        if (!isAdmin && roteiro.criador_id !== userId) {
            return res.status(403).json({
                success: false,
                message:
                    'Apenas o criador ou um administrador pode atualizar o roteiro',
            });
        }

        // Não permitir atualização de roteiros concluídos ou cancelados
        if (roteiro.status === 'concluido' || roteiro.status === 'cancelado') {
            return res.status(400).json({
                success: false,
                message:
                    'Não é possível atualizar roteiros concluídos ou cancelados',
            });
        }

        // Construir query de atualização dinamicamente
        const updateFields = [];
        const updateValues = [];

        if (data) {
            updateFields.push('data = ?');
            updateValues.push(data);
        }
        if (horaInicio) {
            updateFields.push('hora_inicio = ?');
            updateValues.push(horaInicio);
        }
        if (horaFim) {
            updateFields.push('hora_fim = ?');
            updateValues.push(horaFim);
        }
        if (status) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }
        if (vagasDisponiveis !== undefined) {
            updateFields.push('vagas_disponiveis = ?');
            updateValues.push(vagasDisponiveis);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum campo para atualizar',
            });
        }

        updateValues.push(id);

        // Iniciar transação
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            await connection.query(
                `UPDATE ROTEIRO SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues,
            );

            // Buscar roteiro atualizado com todas as informações
            const [roteiroAtualizado] = await connection.query(
                `
                    SELECT 
                        r.*,
                        p.nome as passeio_nome,
                        p.descricao as passeio_descricao,
                        p.preco,
                        p.duracao_horas,
                        p.nivel_dificuldade,
                        p.inclui_refeicao,
                        p.inclui_transporte,
                        d.nome as destino_nome,
                        d.cidade,
                        d.estado,
                        ps.nome as guia_nome,
                        pc.nome as criador_nome
                    FROM ROTEIRO r
                    JOIN PASSEIO p ON r.passeio_id = p.id
                    JOIN DESTINO d ON p.destino_id = d.id
                    JOIN GUIA g ON p.guia_id = g.id
                    JOIN PESSOA ps ON g.pessoa_id = ps.id
                    JOIN PESSOA pc ON r.criador_id = pc.id
                    WHERE r.id = ?
                `,
                [id],
            );

            await connection.commit();

            res.json({
                success: true,
                message: 'Roteiro atualizado com sucesso',
                roteiro: roteiroAtualizado[0],
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Erro ao atualizar roteiro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao atualizar roteiro',
        });
    }
};

export const deleteRoteiro = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        // Verificar se o roteiro existe
        const [roteiros] = await pool.query(
            'SELECT * FROM ROTEIRO WHERE id = ?',
            [id],
        );

        if (roteiros.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Roteiro não encontrado',
            });
        }

        const roteiro = roteiros[0];

        // Verificar se o usuário tem permissão (admin ou criador)
        if (!isAdmin && roteiro.criador_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Apenas o criador ou um administrador pode excluir o roteiro',
            });
        }

        // Não permitir exclusão de roteiros concluídos
        if (roteiro.status === 'concluido') {
            return res.status(400).json({
                success: false,
                message: 'Não é possível excluir roteiros concluídos',
            });
        }

        // Iniciar transação
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // Excluir avaliações relacionadas
            await connection.query(
                'DELETE FROM AVALIACAO_ROTEIRO WHERE roteiro_id = ?',
                [id],
            );

            // Excluir roteiro
            await connection.query('DELETE FROM ROTEIRO WHERE id = ?', [id]);

            await connection.commit();

            res.json({
                success: true,
                message: 'Roteiro removido com sucesso',
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Erro ao excluir roteiro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao excluir roteiro',
        });
    }
};
