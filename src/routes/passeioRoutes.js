import express from 'express';
import { 
    createPasseio,
    listPasseios,
    getPasseioById,
    updatePasseio,
    deletePasseio,
    getUserPasseios,
} from '../controllers/passeioController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Passeios
 *   description: Gerenciamento de passeios turísticos
 */

/**
 * @swagger
 * /passeios:
 *   post:
 *     tags: [Passeios]
 *     summary: Cria um novo passeio
 *     description: Cria um novo passeio turístico (requer autenticação)
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
 *               - descricao
 *               - preco
 *               - destino_id
 *               - duracao_horas
 *               - capacidade_maxima
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "Trilha do Sol"
 *               descricao:
 *                 type: string
 *                 example: "Linda trilha com vista para o mar"
 *               preco:
 *                 type: number
 *                 example: 150.00
 *               duracao_horas:
 *                 type: integer
 *                 example: 4
 *               nivel_dificuldade:
 *                 type: string
 *                 enum: [facil, moderado, dificil]
 *                 example: "moderado"
 *               inclui_refeicao:
 *                 type: boolean
 *                 example: true
 *               inclui_transporte:
 *                 type: boolean
 *                 example: false
 *               destino_id:
 *                 type: integer
 *                 example: 1
 *               capacidade_maxima:
 *                 type: integer
 *                 example: 20
 *     responses:
 *       201:
 *         description: Passeio criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado - Apenas guias podem criar passeios
 */
router.post('/', authMiddleware, createPasseio);

/**
 * @swagger
 * /passeios:
 *   get:
 *     tags: [Passeios]
 *     summary: Lista todos os passeios
 *     parameters:
 *       - in: query
 *         name: destino_id
 *         schema:
 *           type: integer
 *         description: Filtrar por destino
 *       - in: query
 *         name: criador_id
 *         schema:
 *           type: integer
 *         description: Filtrar por criador do passeio
 *       - in: query
 *         name: nivel_dificuldade
 *         schema:
 *           type: string
 *           enum: [facil, moderado, dificil]
 *         description: Filtrar por nível de dificuldade
 *       - in: query
 *         name: preco_min
 *         schema:
 *           type: number
 *         description: Preço mínimo
 *       - in: query
 *         name: preco_max
 *         schema:
 *           type: number
 *         description: Preço máximo
 *     responses:
 *       200:
 *         description: Lista de passeios recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 passeios:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PasseioCompleto'
 */ 
router.get('/', listPasseios);

/**
 * @swagger
 * /passeios/{id}:
 *   get:
 *     tags: [Passeios]
 *     summary: Busca um passeio pelo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Passeio encontrado com sucesso
 *       404:
 *         description: Passeio não encontrado
 * 
 *   patch:
 *     tags: [Passeios]
 *     summary: Atualiza parcialmente um passeio
 *     description: Permite atualizar um ou mais campos do passeio (apenas o guia criador ou admin)
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
 *               descricao:
 *                 type: string
 *               preco:
 *                 type: number
 *               duracao_horas:
 *                 type: integer
 *               nivel_dificuldade:
 *                 type: string
 *                 enum: [facil, moderado, dificil]
 *               inclui_refeicao:
 *                 type: boolean
 *               inclui_transporte:
 *                 type: boolean
 *               capacidade_maxima:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Passeio atualizado com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Passeio não encontrado
 * 
 *   delete:
 *     tags: [Passeios]
 *     summary: Remove um passeio
 *     description: Apenas o guia criador ou admin pode remover o passeio
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
 *         description: Passeio removido com sucesso
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Passeio não encontrado
 */
router.get('/:id', getPasseioById);
router.patch('/:id', authMiddleware, updatePasseio);
router.delete('/:id', authMiddleware, deletePasseio);

/**
 * @swagger
 * /passeios/usuario/{userId}:
 *   get:
 *     tags: [Passeios]
 *     summary: Lista todos os passeios de um usuário específico
 *     description: Retorna os passeios criados por um usuário específico, com paginação
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
 *         name: nivel_dificuldade
 *         schema:
 *           type: string
 *           enum: [facil, moderado, dificil]
 *         description: Filtrar por nível de dificuldade
 *     responses:
 *       200:
 *         description: Lista de passeios recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 passeios:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PasseioCompleto'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total de passeios
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
 *         description: Erro ao buscar passeios
 */
router.get('/usuario/:userId', getUserPasseios);

export default router;