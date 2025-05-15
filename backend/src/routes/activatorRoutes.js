const express = require('express');
const router = express.Router();
const {
    createNewActivator,
    getAllActivatorsAdmin,
    getActivatorDetailsById,
    updateActivatorInfo,
    assignMediaToActivator,
    deleteExistingActivator,
    getVisualizerDisplayContent,
} = require('../controllers/activatorController');
const { isAdmin, isViewer } = require('../middleware/authMiddleware'); // `protect` global

// Rutas para Administradores
router.post('/', isAdmin, createNewActivator);
router.get('/', isAdmin, getAllActivatorsAdmin);
router.get('/:id', isAdmin, getActivatorDetailsById);
router.put('/:id', isAdmin, updateActivatorInfo);
router.patch('/:id/assign-media', isAdmin, assignMediaToActivator);
router.delete('/:id', isAdmin, deleteExistingActivator);

// Ruta para el frontend del Visualizador (protegida para viewers o admins)
router.get('/content/:visualizerId', isViewer, getVisualizerDisplayContent);

module.exports = router;
