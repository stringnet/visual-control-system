// backend/src/routes/mediaRoutes.js
const express = require('express');
const router = express.Router();

// Importar controladores
const {
    uploadNewMedia,
    getAllUploadedMedia,
    getMediaDetailsById,
    deleteMediaFile,
} = require('../controllers/mediaController');

// Importar middleware de autenticación
const { isAdmin, isViewer } = require('../middleware/authMiddleware'); 
// El middleware 'protect' se aplica globalmente a /api/media en server.js

// Importar el nuevo middleware de subida que maneja múltiples campos
const { handleMediaUploadFields } = require('../middleware/uploadMiddleware'); // Actualizado

// Todas las rutas aquí ya están protegidas por `protect` (ver server.js)
// Se añade `isAdmin` o `isViewer` donde sea necesario un rol específico.

// Ruta para subir nuevo contenido multimedia (imagen, video, o registrar webpage/pixelmap)
// Ahora usa handleMediaUploadFields para poder procesar 'mediaFile', 'logoFile', 'audioFile'
router.post('/upload', isAdmin, handleMediaUploadFields, uploadNewMedia);

// Ruta para obtener toda la multimedia (solo admins)
router.get('/', isAdmin, getAllUploadedMedia);

// Ruta para obtener detalles de un contenido multimedia específico
// (Viewers y Admins pueden acceder, la lógica de qué pueden ver puede estar en el controlador o ser más granular)
router.get('/:id', isViewer, getMediaDetailsById);

// Ruta para eliminar un contenido multimedia (solo admins)
router.delete('/:id', isAdmin, deleteMediaFile);

module.exports = router;
