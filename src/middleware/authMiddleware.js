import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar informações do usuário com join entre PESSOAS e AUTHS
        const [users] = await pool.query(
            `SELECT p.*, a.role 
             FROM PESSOAS p 
             JOIN AUTHs a ON p.id = a.pessoa_id 
             WHERE p.id = ?`,
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Usuário não encontrado.' });
        }

        // Adicionar usuário à requisição
        req.user = users[0];
        
        next();
    } catch (error) {
        console.error('Erro de autenticação:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token inválido.' });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expirado. Faça login novamente.' });
        }
        
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
};

export default authMiddleware;