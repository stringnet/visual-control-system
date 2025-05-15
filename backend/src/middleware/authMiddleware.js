const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) 1  => {
let token;
const authHeader = req.headers.authorization;
if (authHeader && authHeader.startsWith('Bearer')) {
    try {
        token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Añade el usuario (sin la contraseña) al objeto `req`
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            res.status(401);
            throw new Error('No autorizado, usuario no encontrado con este token.');
        }
        next();
    } catch (error) {
        console.error('Error de autenticación:', error.message);
        res.status(401);
        throw new Error('No autorizado, token fallido o expirado.');
    }
}

if (!token) {
    res.status(401);
    throw new Error('No autorizado, no se proporcionó token.');
}
});

const isAdmin = (req, res, next) => {
if (req.user && req.user.role === 'admin') {
next();
} else {
res.status(403); // Forbidden
throw new Error('Acceso denegado. Se requiere rol de administrador.');
}
};

const isViewer = (req, res, next) => {
// Un admin también puede tener permisos de viewer para ciertas rutas
if (req.user && (req.user.role === 'viewer' || req.user.role === 'admin')) {
next();
} else {
res.status(403);
throw new Error('Acceso denegado. Se requiere rol de visualizador o administrador.');
}
};

module.exports = { protect, isAdmin, isViewer };
