// backend/src/middleware/uploadMiddleware.js
const multer = require('multer');
// const path = require('path'); // Ya no es estrictamente necesario aquí para la lógica de almacenamiento
const cloudinaryV2 = require('cloudinary').v2;

// Configurar el SDK de Cloudinary v2 si las variables de entorno están presentes.
// Esta configuración es para el uso general del SDK de Cloudinary (ej. en controladores).
if (process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET) {
    cloudinaryV2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true, // Es buena práctica forzar URLs seguras (https)
    });
    console.log("☁️ SDK de Cloudinary v2 configurado exitosamente.");
} else {
    // Es importante advertir si Cloudinary no está configurado, ya que las subidas fallarán.
    console.warn("⚠️ ADVERTENCIA: Las variables de entorno de Cloudinary no están completamente configuradas. Las operaciones con Cloudinary (como la subida de archivos) podrían fallar.");
}

// Configurar Multer para usar almacenamiento en memoria (memoryStorage).
// Esto hace que el archivo se guarde como un buffer en req.file.buffer.
const storage = multer.memoryStorage();

// Definir un filtro de archivos para aceptar solo imágenes y videos.
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true); // Aceptar el archivo
    } else {
        // Rechazar el archivo con un mensaje de error específico.
        cb(new Error('Tipo de archivo no soportado. Solo se permiten imágenes y videos.'), false);
    }
};

// Crear la instancia de Multer con la configuración de almacenamiento, límites y filtro.
const upload = multer({
    storage: storage, // Usar el almacenamiento en memoria definido arriba.
    limits: {
        fileSize: 50 * 1024 * 1024 // Límite de tamaño de archivo de 50MB (ajustar según sea necesario).
    },
    fileFilter: fileFilter, // Aplicar el filtro de tipo de archivo.
});

// Middleware para procesar la subida de un solo archivo.
// El archivo estará disponible en `req.file` en el siguiente middleware o controlador.
// 'mediaFile' debe ser el nombre del campo (<input type="file" name="mediaFile">) en el formulario del cliente.
const uploadSingleMediaInMemory = upload.single('mediaFile');

// Exportar el middleware de subida y la instancia configurada de cloudinaryV2.
// cloudinaryV2 se exporta para que pueda ser utilizado por los controladores para operaciones como el borrado.
module.exports = { uploadSingleMediaInMemory, cloudinaryV2 };
