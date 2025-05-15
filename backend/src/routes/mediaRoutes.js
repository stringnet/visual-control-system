// backend/src/routes/mediaRoutes.js
const express = require('express');
const router = express.Router();

// Importar controladores
const mediaController = require('../controllers/mediaController');
// const {
//     uploadNewMedia,
//     getAllUploadedMedia,
//     getMediaDetailsById,
//     deleteMediaFile,
// } = require('../controllers/mediaController'); // Comentado para depuración individual

// Importar middleware de autenticación
const authMiddleware = require('../middleware/authMiddleware');
// const { isAdmin, isViewer } = require('../middleware/authMiddleware'); // Comentado para depuración individual

// Importar middleware de subida
const uploadMiddleware = require('../middleware/uploadMiddleware');
// const { uploadSingleMediaInMemory } = require('../middleware/uploadMiddleware'); // Comentado para depuración individual

// --- INICIO DE LÍNEAS DE DEPURACIÓN ---
console.log("--- Verificando importaciones en mediaRoutes.js ---");

// Verificar authMiddleware y sus propiedades
console.log("authMiddleware:", typeof authMiddleware);
console.log("authMiddleware.isAdmin:", typeof authMiddleware.isAdmin);
const isAdmin = authMiddleware.isAdmin; // Asignar para usar abajo

// Verificar uploadMiddleware y sus propiedades
console.log("uploadMiddleware:", typeof uploadMiddleware);
console.log("uploadMiddleware.uploadSingleMediaInMemory:", typeof uploadMiddleware.uploadSingleMediaInMemory);
const uploadSingleMediaInMemory = uploadMiddleware.uploadSingleMediaInMemory; // Asignar para usar abajo

// Verificar mediaController y sus propiedades
console.log("mediaController:", typeof mediaController);
console.log("mediaController.uploadNewMedia:", typeof mediaController.uploadNewMedia);
const uploadNewMedia = mediaController.uploadNewMedia; // Asignar para usar abajo
const getAllUploadedMedia = mediaController.getAllUploadedMedia;
const getMediaDetailsById = mediaController.getMediaDetailsById;
const deleteMediaFile = mediaController.deleteMediaFile;

// Verificar isViewer (aunque no se usa en la ruta POST /upload, es bueno verificarlo si se usa en otras)
console.log("authMiddleware.isViewer:", typeof authMiddleware.isViewer);
const isViewer = authMiddleware.isViewer;

console.log("--- Fin de la verificación de importaciones ---");
// --- FIN DE LÍNEAS DE DEPURACIÓN ---


// Definición de Rutas
// Se asume que el middleware `protect` se aplica globalmente en server.js para /api/media

// POST /api/media/upload
if (typeof isAdmin !== 'function' || typeof uploadSingleMediaInMemory !== 'function' || typeof uploadNewMedia !== 'function') {
    console.error("¡ALERTA! Uno de los manejadores para POST /upload es undefined.");
    console.error("typeof isAdmin:", typeof isAdmin);
    console.error("typeof uploadSingleMediaInMemory:", typeof uploadSingleMediaInMemory);
    console.error("typeof uploadNewMedia:", typeof uploadNewMedia);
    // Podrías incluso evitar definir la ruta si algo es undefined para prevenir el crash
} else {
    router.post('/upload', isAdmin, uploadSingleMediaInMemory, uploadNewMedia);
}

router.get('/', isAdmin, getAllUploadedMedia);

// Asegurarse que isViewer sea una función antes de usarla
if (typeof isViewer === 'function' && typeof getMediaDetailsById === 'function') {
    router.get('/:id', isViewer, getMediaDetailsById);
} else {
    console.error("Error al definir GET /media/:id. isViewer o getMediaDetailsById es undefined.");
    console.error("typeof isViewer:", typeof isViewer);
    console.error("typeof getMediaDetailsById:", typeof getMediaDetailsById);
}

// Asegurarse que isAdmin y deleteMediaFile sean funciones
if (typeof isAdmin === 'function' && typeof deleteMediaFile === 'function') {
    router.delete('/:id', isAdmin, deleteMediaFile);
} else {
    console.error("Error al definir DELETE /media/:id. isAdmin o deleteMediaFile es undefined.");
    console.error("typeof isAdmin:", typeof isAdmin);
    console.error("typeof deleteMediaFile:", typeof deleteMediaFile);
}

module.exports = router;
