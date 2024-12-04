import express from 'express';
import { 
    createDestino,
    listDestinos,
    getDestinoById,
    updateDestino,
    deleteDestino,
    getUserDestinos,
} from '../controllers/destinoController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Destinos
 *   description: Gerenciamento de destinos turísticos
 */

/**
 * @swagger
 * /destinos:
 *   post:
 *     tags: [Destinos]
 *     summary: Cria um novo destino
 *     description: Cria um novo destino turístico (requer privilégios de administrador)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - estado
 *               - cidade
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "Praia de Ponta Negra"
 *               estado:
 *                 type: string
 *                 example: "RN"
 *                 minLength: 2
 *                 maxLength: 2
 *               cidade:
 *                 type: string
 *                 example: "Natal"
 *               descricao:
 *                 type: string
 *                 example: "Uma das praias mais famosas do Rio Grande do Norte"
 *               latitude:
 *                 type: number
 *                 example: -5.8781
 *               longitude:
 *                 type: number
 *                 example: -35.0164
 *     responses:
 *       201:
 *         description: Destino criado com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 */
router.post('/', authMiddleware, createDestino);

/**
 * @swagger
 * /destinos:
 *   get:
 *     tags: [Destinos]
 *     summary: Lista todos os destinos
 *     description: Retorna uma lista de todos os destinos turísticos cadastrados
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *         description: Filtrar por estado (UF)
 *       - in: query
 *         name: cidade
 *         schema:
 *           type: string
 *         description: Filtrar por cidade
 *     responses:
 *       200:
 *         description: Lista de destinos recuperada com sucesso
 */
router.get('/', listDestinos);

/**
 * @swagger
 * /destinos/{id}:
 *   get:
 *     tags: [Destinos]
 *     summary: Busca um destino pelo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Destino encontrado com sucesso
 *       404:
 *         description: Destino não encontrado
 *
 *   patch:
 *     tags: [Destinos]
 *     summary: Atualiza parcialmente um destino
 *     description: Permite atualizar um ou mais campos do destino (requer privilégios de administrador)
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
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "Praia de Ponta Negra"
 *               estado:
 *                 type: string
 *                 example: "RN"
 *                 minLength: 2
 *                 maxLength: 2
 *               cidade:
 *                 type: string
 *                 example: "Natal"
 *               descricao:
 *                 type: string
 *                 example: "Uma das praias mais famosas do Rio Grande do Norte"
 *               latitude:
 *                 type: number
 *                 example: -5.8781
 *               longitude:
 *                 type: number
 *                 example: -35.0164
 *     responses:
 *       200:
 *         description: Destino atualizado com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Destino não encontrado
 *
 *   delete:
 *     tags: [Destinos]
 *     summary: Remove um destino
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Destino removido com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Destino não encontrado
 */
router.get('/:id', getDestinoById);
router.patch('/:id', authMiddleware, updateDestino);
router.delete('/:id', authMiddleware, adminMiddleware, deleteDestino);

/**
 * @swagger
 * /destinos/usuario/{userId}:
 *   get:
 *     tags: [Destinos]
 *     summary: Lista todos os destinos de um usuário específico
 *     description: Retorna os destinos criados por um usuário específico, com paginação
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
 *         name: estado
 *         schema:
 *           type: string
 *         description: Filtrar por estado (UF)
 *       - in: query
 *         name: cidade
 *         schema:
 *           type: string
 *         description: Filtrar por cidade
 *     responses:
 *       200:
 *         description: Lista de destinos recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 destinos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DestinoCompleto'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total de destinos
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
 *         description: Erro ao buscar destinos
 */
router.get('/usuario/:userId', getUserDestinos);

export default router;