const express = require('express');
const router = express.Router();
const {
    uploadNewMedia,
    getAllUploadedMedia,
    getMediaDetailsById,
    deleteMediaFile,
} = require('../controllers/mediaController');
const { isAdmin, isViewer } = require('../middleware/authMiddleware'); // `protect` se aplica globalmente en server.js
const { uploadSingleMedia } = require('../middleware/uploadMiddleware');

// Todas las rutas aquí ya están protegidas por `protect` (ver server.js)
// Se añade `isAdmin` o `isViewer` donde sea necesario un rol específico.

router.post('/upload', isAdmin, uploadSingleMedia, uploadNewMedia);
router.get('/', isAdmin, getAllUploadedMedia); // Solo admins pueden listar toda la media
router.get('/:id', isViewer, getMediaDetailsById); // Viewers (y admins) pueden ver detalles si es necesario
router.delete('/:id', isAdmin, deleteMediaFile);

module.exports = router;
