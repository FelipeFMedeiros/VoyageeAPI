import express from 'express';
import { register, login, verifyToken, listUsers } from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Autenticação
 *   description: Endpoints de autenticação e gerenciamento de usuários
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Autenticação]
 *     summary: Registra um novo usuário
 *     description: Cria uma nova conta de usuário (guia ou viajante)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userType
 *               - name
 *               - email
 *               - cpf
 *               - phone
 *               - password
 *             properties:
 *               userType:
 *                 type: string
 *                 enum: [guia, viajante]
 *                 example: "viajante"
 *               name:
 *                 type: string
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *               cpf:
 *                 type: string
 *                 example: "12345678900"
 *               phone:
 *                 type: string
 *                 example: "11999999999"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "senha123"
 *               dataNascimento:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *               country:
 *                 type: string
 *                 example: "Brasil"
 *               state:
 *                 type: string
 *                 example: "SP"
 *               city:
 *                 type: string
 *                 example: "São Paulo"
 *               zipCode:
 *                 type: string
 *                 example: "01234567"
 *               streetAddress:
 *                 type: string
 *                 example: "Rua das Flores"
 *               number:
 *                 type: string
 *                 example: "123"
 *               complement:
 *                 type: string
 *                 example: "Apto 45"
 *               bairro:
 *                 type: string
 *                 example: "Centro"
 *               biografia:
 *                 type: string
 *                 example: "Guia experiente em trilhas..."
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
 *       400:
 *         description: Dados inválidos ou usuário já existe
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/register', register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Autenticação]
 *     summary: Realiza login do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@email.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "senha123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nome:
 *                       type: string
 *                     email:
 *                       type: string
 *                     tipo:
 *                       type: string
 *                       enum: [guia, viajante]
 *                     role:
 *                       type: string
 *                       enum: [user, guide]
 *       401:
 *         description: Credenciais inválidas
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/verify-token:
 *   get:
 *     tags: [Autenticação]
 *     summary: Verifica token e retorna dados do usuário
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     nome:
 *                       type: string
 *                     email:
 *                       type: string
 *                     tipo:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Token inválido ou expirado
 */
router.get('/verify-token', authMiddleware, verifyToken);

/**
 * @swagger
 * /auth/users:
 *   get:
 *     tags: [Autenticação]
 *     summary: Lista todos os usuários ativos
 *     description: Retorna uma lista de todos os usuários ativos no sistema (requer permissão de administrador)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários recuperada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       nome:
 *                         type: string
 *                       email:
 *                         type: string
 *                       telefone:
 *                         type: string
 *                       tipo:
 *                         type: string
 *                         enum: [guia, viajante]
 *                       role:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       last_login:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Não autorizado - Apenas administradores podem acessar este recurso
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/users', authMiddleware, adminMiddleware, listUsers);

export default router;