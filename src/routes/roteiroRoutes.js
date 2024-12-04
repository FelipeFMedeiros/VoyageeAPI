import express from 'express';
import {
    createRoteiro,
    listRoteiros,
    getRoteiroById,
    avaliarRoteiro,
    updateRoteiro,
    deleteRoteiro,
    getUserRoteiros,
} from '../controllers/roteiroController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Roteiros
 *   description: Gerenciamento de roteiros turísticos
 */

/**
 * @swagger
 * /roteiros:
 *   post:
 *     tags: [Roteiros]
 *     summary: Cria um novo roteiro
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passeioId
 *               - data
 *               - horaInicio
 *               - horaFim
 *               - vagasDisponiveis
 *             properties:
 *               passeioId:
 *                 type: integer
 *                 example: 1
 *               data:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-25"
 *               horaInicio:
 *                 type: string
 *                 format: time
 *                 example: "09:00"
 *               horaFim:
 *                 type: string
 *                 format: time
 *                 example: "17:00"
 *               vagasDisponiveis:
 *                 type: integer
 *                 minimum: 1
 *                 example: 20
 *     responses:
 *       201:
 *         description: Roteiro criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoteiroCompleto'
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 */
router.post('/', authMiddleware, createRoteiro);

/**
 * @swagger
 * /roteiros:
 *   get:
 *     tags: [Roteiros]
 *     summary: Lista todos os roteiros
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [agendado, confirmado, concluido, cancelado]
 *       - in: query
 *         name: data
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: destino
 *         schema:
 *           type: integer
 *       - in: query
 *         name: criadorId
 *         schema:
 *           type: integer
 *         description: ID do criador do roteiro
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Quantidade de itens por página
 *     responses:
 *       200:
 *         description: Lista de roteiros recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 roteiros:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RoteiroCompleto'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total de roteiros
 *                     totalPages:
 *                       type: integer
 *                       description: Total de páginas
 *                     currentPage:
 *                       type: integer
 *                       description: Página atual
 *                     limit:
 *                       type: integer
 *                       description: Itens por página
 *                     hasNext:
 *                       type: boolean
 *                       description: Indica se há próxima página
 *                     hasPrevious:
 *                       type: boolean
 *                       description: Indica se há página anterior
 */
router.get('/', listRoteiros);

/**
 * @swagger
 * /roteiros/{id}:
 *   get:
 *     tags: [Roteiros]
 *     summary: Busca um roteiro específico pelo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do roteiro
 *     responses:
 *       200:
 *         description: Roteiro encontrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 roteiro:
 *                   $ref: '#/components/schemas/RoteiroCompleto'
 */
router.get('/:id', getRoteiroById);

/**
 * @swagger
 * /roteiros/{id}/avaliar:
 *   post:
 *     tags: [Roteiros]
 *     summary: Avalia um roteiro concluído
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nota
 *             properties:
 *               nota:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *                 example: 4.5
 *               comentario:
 *                 type: string
 *                 example: "Experiência incrível!"
 *     responses:
 *       200:
 *         description: Avaliação registrada com sucesso
 *       400:
 *         description: Roteiro não pode ser avaliado ou dados inválidos
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Roteiro não encontrado
 */
router.post('/:roteiroId/avaliar', authMiddleware, avaliarRoteiro);

/**
 * @swagger
 * components:
 *   schemas:
 *     RoteiroCompleto:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         passeio_id:
 *           type: integer
 *         data:
 *           type: string
 *           format: date
 *         hora_inicio:
 *           type: string
 *           format: time
 *         hora_fim:
 *           type: string
 *           format: time
 *         status:
 *           type: string
 *           enum: [agendado, confirmado, concluido, cancelado]
 *         vagas_disponiveis:
 *           type: integer
 *         passeio_nome:
 *           type: string
 *         passeio_descricao:
 *           type: string
 *         preco:
 *           type: number
 *         duracao_horas:
 *           type: integer
 *         nivel_dificuldade:
 *           type: string
 *         inclui_refeicao:
 *           type: boolean
 *         inclui_transporte:
 *           type: boolean
 *         capacidade_maxima:
 *           type: integer
 *         passeio_criador_id:
 *           type: integer
 *         destino_nome:
 *           type: string
 *         cidade:
 *           type: string
 *         estado:
 *           type: string
 *         criador_id:
 *           type: integer
 *         criador_nome:
 *           type: string
 *         criador_email:
 *           type: string
 *         criador_biografia:
 *           type: string
 *         criador_eh_guia:
 *           type: boolean
 *           description: Indica se o criador do roteiro é um guia cadastrado
 *         avaliacao_media:
 *           type: number
 *         total_avaliacoes:
 *           type: integer
 *         avaliacoes:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               nota:
 *                 type: number
 *               comentario:
 *                 type: string
 *               avaliador_nome:
 *                 type: string
 *               created_at:
 *                 type: string
 *                 format: date-time
 */

/**
 * @swagger
 * /roteiros/{id}:
 *   patch:
 *     tags: [Roteiros]
 *     summary: Atualiza um roteiro
 *     description: Atualiza os dados de um roteiro (apenas o criador ou administrador)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do roteiro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: string
 *                 format: date
 *               horaInicio:
 *                 type: string
 *                 format: time
 *               horaFim:
 *                 type: string
 *                 format: time
 *               status:
 *                 type: string
 *                 enum: [agendado, confirmado, concluido, cancelado]
 *               vagasDisponiveis:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Roteiro atualizado com sucesso
 *       400:
 *         description: Dados inválidos ou roteiro não pode ser atualizado
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Apenas o criador ou administrador pode atualizar o roteiro 
 *       404:
 *         description: Roteiro não encontrado
 *
 *   delete:
 *     tags: [Roteiros]
 *     summary: Remove um roteiro
 *     description: Remove um roteiro (apenas o criador ou administrador)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do roteiro
 *     responses:
 *       200:
 *         description: Roteiro removido com sucesso
 *       400:
 *         description: Roteiro não pode ser removido
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Apenas o criador ou administrador pode remover o roteiro
 *       404:
 *         description: Roteiro não encontrado
 */
router.patch('/:id', authMiddleware, updateRoteiro);
router.delete('/:id', authMiddleware, deleteRoteiro);

/**
 * @swagger
 * /roteiros/usuario/{userId}:
 *   get:
 *     tags: [Roteiros]
 *     summary: Lista todos os roteiros de um usuário específico
 *     description: Retorna os roteiros criados por um usuário específico, com paginação
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do usuário
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Quantidade de itens por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [agendado, confirmado, concluido, cancelado]
 *         description: Filtrar por status do roteiro
 *     responses:
 *       200:
 *         description: Lista de roteiros recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 roteiros:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RoteiroCompleto'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total de roteiros
 *                     totalPages:
 *                       type: integer
 *                       description: Total de páginas
 *                     currentPage:
 *                       type: integer
 *                       description: Página atual
 *                     limit:
 *                       type: integer
 *                       description: Itens por página
 *                     hasNext:
 *                       type: boolean
 *                       description: Indica se há próxima página
 *                     hasPrevious:
 *                       type: boolean
 *                       description: Indica se há página anterior
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro ao buscar roteiros
 */
router.get('/usuario/:userId', getUserRoteiros);

export default router;