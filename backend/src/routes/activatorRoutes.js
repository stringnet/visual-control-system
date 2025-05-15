// backend/src/routes/activatorRoutes.js
const express = require('express');
const router = express.Router();
const {
    createNewActivator,
    getAllActivatorsAdmin,
    getActivatorDetailsById,
    updateActivatorInfo,
    assignMediaToActivator,
    deleteExistingActivator,
    getVisualizerDisplayContent, // Daytoy ti function a maus-usar para iti /content/:visualizerId
} = require('../controllers/activatorController');
const { isAdmin, isViewer, protect } = require('../middleware/authMiddleware'); // Importar ti protect tapno mausar kadagiti dadduma a ruta

// Rutas para dagiti Administradores (amin dagitoy ket protektado)
router.post('/', protect, isAdmin, createNewActivator);
router.get('/', protect, isAdmin, getAllActivatorsAdmin);
router.get('/:id', protect, isAdmin, getActivatorDetailsById);
router.put('/:id', protect, isAdmin, updateActivatorInfo);
router.patch('/:id/assign-media', protect, isAdmin, assignMediaToActivator);
router.delete('/:id', protect, isAdmin, deleteExistingActivator);

// Ruta para ti frontend ti Visualizador (para ti publiko)
// Inikkat ti 'isViewer' (ken ti 'protect' a nairaman) tapno daytoy a ruta ket publiko
router.get('/content/:visualizerId', getVisualizerDisplayContent);

module.exports = router;
