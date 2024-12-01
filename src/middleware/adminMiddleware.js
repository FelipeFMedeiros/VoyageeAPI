const adminMiddleware = (req, res, next) => {
    // O usuário já foi verificado pelo authMiddleware
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message:
                'Acesso negado. Apenas administradores podem acessar este recurso.',
        });
    }
    next();
};

export default adminMiddleware;
