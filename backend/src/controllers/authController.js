const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Función para generar token JWT
const generateToken = (userId, userRole) => {
    return jwt.sign({ id: userId, role: userRole }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

// @desc    Registrar un nuevo administrador (Idealmente, proteger o limitar esta ruta)
// @route   POST /api/auth/register-admin
// @access  Public (o protegido después del primer admin)
const registerAdmin = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400);
        throw new Error('Por favor, proporciona nombre de usuario y contraseña.');
    }

    // Opcional: Verificar si ya existe un administrador (podrías permitir varios)
    // const adminCount = await User.countDocuments({ role: 'admin' });
    // if (adminCount > 0 && !req.user?.role === 'admin') { // Si ya hay admins, solo otro admin puede crear más
    //     res.status(403);
    //     throw new Error('Solo un administrador puede registrar nuevos administradores.');
    // }

    const userExists = await User.findOne({ username });
    if (userExists) {
        res.status(400);
        throw new Error('El nombre de usuario ya está en uso.');
    }

    const user = await User.create({
        username,
        password, // El hash se hace en el pre-save hook del modelo
        role: 'admin',
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            username: user.username,
            role: user.role,
            token: generateToken(user._id, user.role),
            message: "Administrador registrado exitosamente."
        });
    } else {
        res.status(400);
        throw new Error('Datos de usuario inválidos.');
    }
});

// @desc    Crear un nuevo usuario visualizador (solo un admin puede hacerlo)
// @route   POST /api/auth/create-viewer
// @access  Private/Admin
const createViewerUser = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400);
        throw new Error('Por favor, proporciona nombre de usuario y contraseña para el visualizador.');
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
        res.status(400);
        throw new Error(`El visualizador con nombre de usuario '${username}' ya existe.`);
    }

    const viewer = await User.create({
        username,
        password,
        role: 'viewer',
    });

    if (viewer) {
        res.status(201).json({
            _id: viewer._id,
            username: viewer.username,
            role: viewer.role,
            message: `Usuario visualizador '${viewer.username}' creado exitosamente.`
            // No se devuelve token aquí, el visualizador debe hacer login por separado
        });
    } else {
        res.status(400);
        throw new Error('Datos de visualizador inválidos.');
    }
});

// @desc    Autenticar un usuario (admin o viewer) y obtener token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400);
        throw new Error('Por favor, proporciona nombre de usuario y contraseña.');
    }

    const user = await User.findOne({ username }).select('+password'); // Incluir la contraseña para comparación

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            username: user.username,
            role: user.role,
            token: generateToken(user._id, user.role),
        });
    } else {
        res.status(401); // No autorizado
        throw new Error('Nombre de usuario o contraseña inválidos.');
    }
});

// @desc    Obtener el perfil del usuario actualmente logueado
// @route   GET /api/auth/me
// @access  Private (requiere token)
const getMyProfile = asyncHandler(async (req, res) => {
    // req.user es establecido por el middleware 'protect'
    res.status(200).json({
        _id: req.user._id,
        username: req.user.username,
        role: req.user.role,
    });
});

// @desc    Listar todos los usuarios (para el panel de administración)
// @route   GET /api/auth/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password'); // Excluir contraseñas de la respuesta
    res.status(200).json(users);
});

// @desc    Eliminar un usuario (solo un admin puede hacerlo)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
    const userToDelete = await User.findById(req.params.id);

    if (!userToDelete) {
        res.status(404);
        throw new Error('Usuario no encontrado.');
    }

    // Prevenir que un admin se elimine a sí mismo o al último admin (lógica opcional)
    if (userToDelete.role === 'admin' && req.user._id.equals(userToDelete._id)) {
         res.status(400);
         throw new Error('No puedes eliminar tu propia cuenta de administrador activa.');
    }
    // const adminCount = await User.countDocuments({ role: 'admin' });
    // if (userToDelete.role === 'admin' && adminCount <= 1) {
    //     res.status(400);
    //     throw new Error('No se puede eliminar el último administrador del sistema.');
    // }

    await User.findByIdAndDelete(req.params.id);
    // Considerar qué hacer con la media o activadores creados por este usuario.

    res.status(200).json({ message: `Usuario '${userToDelete.username}' eliminado exitosamente.` });
});

module.exports = {
    registerAdmin,
    createViewerUser,
    loginUser,
    getMyProfile,
    getAllUsers,
    deleteUser,
};
