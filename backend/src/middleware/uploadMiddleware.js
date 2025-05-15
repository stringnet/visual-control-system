const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinaryV2 = require('cloudinary').v2;

// Configurar Cloudinary si las variables de entorno están presentes
let storage;
if (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinaryV2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    storage = new CloudinaryStorage({
        cloudinary: cloudinaryV2,
        params: async (req, file) => {
            let folderName = 'easypanel_media/general';
            let resourceType = 'auto';

            if (file.mimetype.startsWith('image/')) {
                folderName = 'easypanel_media/images';
                resourceType = 'image';
            } else if (file.mimetype.startsWith('video/')) {
                folderName = 'easypanel_media/videos';
                resourceType = 'video';
            }

            return {
                folder: folderName,
                public_id: `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1E3)}`,
                resource_type: resourceType,
                // Opcional: Transformaciones al subir
                // eager: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }],
            };
        },
    });
    console.log("☁️ Usando Cloudinary para almacenamiento de media.");
} else {
    // Fallback a almacenamiento local si Cloudinary no está configurado
    console.warn("⚠️ Cloudinary no configurado, usando almacenamiento local para media. Asegúrate que la carpeta 'uploads/' exista en la raíz del backend.");
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadDir = path.join(__dirname, '../../uploads'); // Ruta a la carpeta uploads
            // Asegurarse que el directorio existe (opcional, Multer puede fallar si no existe)
            // const fs = require('fs');
            // if (!fs.existsSync(uploadDir)){
            //     fs.mkdirSync(uploadDir, { recursive: true });
            // }
            cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
            cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
        }
    });
}

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no soportado. Solo se permiten imágenes y videos.'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB (ajusta según tus necesidades)
    },
    fileFilter: fileFilter,
});

// Middleware para un solo archivo llamado 'mediaFile' en el formulario
const uploadSingleMedia = upload.single('mediaFile');

module.exports = { uploadSingleMedia, cloudinaryV2 }; // Exportar cloudinaryV2 para poder usar su API (ej. para borrar)
