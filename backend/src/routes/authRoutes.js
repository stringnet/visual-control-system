const express = require('express');
const router = express.Router();
const {
    registerAdmin,
    createViewerUser,
    loginUser,
    getMyProfile,
    getAllUsers,
    deleteUser,
} = require('../controllers/authController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Rutas Públicas (o semi-protegidas para el primer admin)
// Considera añadir una lógica para que registerAdmin solo funcione si no hay admins, o si el que lo llama es admin.
router.post('/register-admin', registerAdmin);
router.post('/login', loginUser);

// Rutas Protegidas (requieren token válido)
router.get('/me', protect, getMyProfile);

// Rutas solo para Administradores (requieren token y rol de admin)
router.post('/create-viewer', protect, isAdmin, createViewerUser);
router.get('/users', protect, isAdmin, getAllUsers);
router.delete('/users/:id', protect, isAdmin, deleteUser);

module.exports = router;
