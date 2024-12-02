import express from 'express';
import {
    createRoteiro,
    listRoteiros,
    getRoteiroById,
    avaliarRoteiro,
    updateRoteiro,
    deleteRoteiro,
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
 *         name: guiaId
 *         schema:
 *           type: integer
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
 *         destino_nome:
 *           type: string
 *         cidade:
 *           type: string
 *         estado:
 *           type: string
 *         guia_nome:
 *           type: string
 *         criador_nome:
 *           type: string
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
 *     summary: Atualiza parcialmente um roteiro existente
 *     description: Permite atualizar um ou mais campos do roteiro
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
 *                 example: "2024-12-25"
 *               horaInicio:
 *                 type: string
 *                 format: time
 *                 example: "09:00"
 *               horaFim:
 *                 type: string
 *                 format: time
 *                 example: "17:00"
 *               status:
 *                 type: string
 *                 enum: [agendado, confirmado, concluido, cancelado]
 *                 example: "confirmado"
 *               vagasDisponiveis:
 *                 type: integer
 *                 minimum: 0
 *                 example: 15
 *     responses:
 *       200:
 *         description: Roteiro atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoteiroCompleto'
 *       400:
 *         description: Dados inválidos ou roteiro não pode ser atualizado
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Apenas o criador pode atualizar o roteiro
 *       404:
 *         description: Roteiro não encontrado
 *
 *   delete:
 *     tags: [Roteiros]
 *     summary: Remove um roteiro
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Roteiro removido com sucesso"
 *       400:
 *         description: Roteiro não pode ser removido
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Apenas o criador pode remover o roteiro
 *       404:
 *         description: Roteiro não encontrado
 */
router.patch('/:id', authMiddleware, updateRoteiro);
router.delete('/:id', authMiddleware, deleteRoteiro);

export default router;
