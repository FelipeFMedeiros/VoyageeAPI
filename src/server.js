import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger/swagger.js';
import authRoutes from './routes/authRoutes.js';
import pool from './config/database.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
    origin: ['http://192.168.1.2:5173'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Determinar a URL base
const baseUrl = `http://192.168.1.128:${port}`;

// Configuração do Swagger
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rotas
app.use('/auth', authRoutes);

// Rota inicial
app.get('/', async (req, res) => {
    try {
        res.json({
            title: 'Voyagee',
            message: 'Bem-vindo à nossa API.',
            status: 'online',
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({
            title: 'Voyagee',
            message: 'Bem-vindo à nossa API.',
            status: 'online',
            error: {
                message: 'Não foi possível recuperar as estatísticas',
                details:
                    process.env.NODE_ENV === 'development'
                        ? error.message
                        : undefined,
            },
        });
    }
});

// Inicia o servidor
app.listen(port, '192.168.1.128', () => {
    console.log(`Servidor rodando em ${baseUrl}`);
    console.log(`Documentação Swagger disponível em ${baseUrl}/swagger`);
});
