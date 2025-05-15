// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User'); // Asegúrate que este path sea correcto y User.js exista

// Middleware para proteger rutas
const protect = asyncHandler(async (req, res, next) => { // El '1' ha sido eliminado de aquí
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer')) {
        try {
            // Obtener el token del encabezado (Bearer TOKEN_AQUI)
            token = authHeader.split(' ')[1];

            // Verificar el token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Obtener el usuario del token (sin la contraseña) y añadirlo al objeto req
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                res.status(401); // No autorizado
                throw new Error('No autorizado, usuario no encontrado con este token.');
            }
            next(); // Pasar al siguiente middleware o controlador
        } catch (error) {
            console.error('Error de autenticación en middleware protect:', error.message);
            res.status(401); // No autorizado
            // Puedes personalizar el mensaje de error, pero 'Token fallido' es común
            throw new Error('No autorizado, token fallido o expirado.');
        }
    }

    if (!token) {
        res.status(401); // No autorizado
        throw new Error('No autorizado, no se proporcionó token.');
    }
});

// Middleware para verificar si el usuario es administrador
const isAdmin = (req, res, next) => {
    // Se asume que 'protect' ya se ejecutó y req.user está disponible
    if (req.user && req.user.role === 'admin') {
        next(); // El usuario es admin, continuar
    } else {
        res.status(403); // Forbidden (Prohibido)
        throw new Error('Acceso denegado. Se requiere rol de administrador.');
    }
};

// Middleware para verificar si el usuario es un visualizador (o admin, ya que admin puede hacer todo)
const isViewer = (req, res, next) => {
    // Se asume que 'protect' ya se ejecutó y req.user está disponible
    if (req.user && (req.user.role === 'viewer' || req.user.role === 'admin')) {
        next(); // El usuario es viewer o admin, continuar
    } else {
        res.status(403); // Forbidden
        throw new Error('Acceso denegado. Se requiere rol de visualizador o administrador.');
    }
};

module.exports = { protect, isAdmin, isViewer };
