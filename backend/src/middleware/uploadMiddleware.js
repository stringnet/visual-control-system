// backend/src/middleware/uploadMiddleware.js
const multer = require('multer');
const cloudinaryV2 = require('cloudinary').v2;

// Configurar el SDK de Cloudinary v2
if (process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET) {
    cloudinaryV2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
    console.log("☁️ SDK de Cloudinary v2 configurado exitosamente.");
} else {
    console.warn("⚠️ ADVERTENCIA: Las variables de entorno de Cloudinary no están completamente configuradas.");
}

// Usar memoryStorage para que Multer procese los archivos en memoria
const storage = multer.memoryStorage();

// Definir un filtro de archivos general.
// Se pueden aplicar validaciones de tipo más específicas en el controlador si es necesario.
const fileFilter = (req, file, cb) => {
    // Aceptar la mayoría de los tipos comunes de imagen, video y audio
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('video/') || 
        file.mimetype.startsWith('audio/')) {
        cb(null, true); // Aceptar el archivo
    } else {
        console.warn(`Multer fileFilter: Tipo de archivo no soportado - ${file.mimetype} para el archivo ${file.originalname}`);
        // Rechazar el archivo sutilmente, el controlador puede manejar si el archivo es esencial o no.
        // O puedes ser más estricto:
        // cb(new Error('Tipo de archivo no soportado por el filtro general.'), false);
        cb(null, false); // Rechazar el archivo, pero no lanzar un error que pare la cadena de middleware
    }
};

// Crear la instancia de Multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // Límite de tamaño de archivo de 50MB para cualquier archivo individual
    },
    fileFilter: fileFilter,
});

// Middleware para manejar múltiples campos de archivo.
// - 'mediaFile': para subidas de imagen/video estándar.
// - 'logoFile': para el logo de un Pixel Map.
// - 'audioFile': para el audio de un Pixel Map.
// El controlador (mediaController.js) verificará qué campos están presentes en req.files.
const handleMediaUploadFields = upload.fields([
    { name: 'mediaFile', maxCount: 1 }, // Para imágenes/videos directos
    { name: 'logoFile', maxCount: 1 },  // Para el logo del Pixel Map
    { name: 'audioFile', maxCount: 1 }  // Para el audio del Pixel Map
]);

// Exportar el nuevo middleware y la instancia configurada de cloudinaryV2.
module.exports = { handleMediaUploadFields, cloudinaryV2 };
