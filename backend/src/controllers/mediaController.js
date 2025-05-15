// backend/src/controllers/mediaController.js
const asyncHandler = require('express-async-handler');
const path = require('path'); // Útil para obtener el nombre base del archivo original
const Media = require('../models/Media');
const Activator = require('../models/Activator');
const { cloudinaryV2 } = require('../middleware/uploadMiddleware'); // Importamos la instancia configurada de cloudinaryV2

// Función helper para subir un stream/buffer a Cloudinary
// Retorna una Promesa para poder usar async/await
const uploadStreamToCloudinary = (fileBuffer, options) => {
    return new Promise((resolve, reject) => {
        // Usamos upload_stream para enviar el buffer
        const uploadStream = cloudinaryV2.uploader.upload_stream(options, (error, result) => {
            if (error) {
                // Si hay un error durante la subida, rechazamos la promesa
                return reject(error);
            }
            // Si la subida es exitosa, resolvemos la promesa con el resultado de Cloudinary
            resolve(result);
        });
        // Finalizamos el stream enviando el buffer del archivo
        uploadStream.end(fileBuffer);
    });
};

// @desc    Subir un nuevo archivo multimedia
// @route   POST /api/media/upload
// @access  Private/Admin (protegido por 'protect' y 'isAdmin' en las rutas)
const uploadNewMedia = asyncHandler(async (req, res) => {
    // Verificar si se subió un archivo. req.file es poblado por Multer.
    if (!req.file) {
        res.status(400); // Bad Request
        throw new Error('Por favor, selecciona un archivo para subir.');
    }

    const { originalname, mimetype, buffer, size: originalSize } = req.file; // 'buffer' contiene los datos del archivo

    // Verificar si Cloudinary está configurado (las variables de entorno deben estar presentes)
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
        res.status(500); // Internal Server Error
        throw new Error('Cloudinary no está configurado en el servidor. No se puede procesar la subida del archivo.');
    }

    try {
        // Determinar la carpeta y el tipo de recurso para Cloudinary basado en el mimetype
        let folderName = 'easypanel_media/otros'; // Carpeta por defecto
        let resourceType = 'auto'; // Cloudinary intentará detectar el tipo

        if (mimetype.startsWith('image/')) {
            folderName = 'easypanel_media/imagenes';
            resourceType = 'image';
        } else if (mimetype.startsWith('video/')) {
            folderName = 'easypanel_media/videos';
            resourceType = 'video';
        }

        // Opciones para la subida a Cloudinary
        const cloudinaryUploadOptions = {
            folder: folderName,
            resource_type: resourceType,
            // Generar un public_id único usando el nombre original del archivo (sin extensión) y un timestamp
            public_id: `${path.parse(originalname).name.replace(/[^a-zA-Z0-9_]/g, '_')}-${Date.now()}`,
            // Podrías añadir más opciones aquí, como transformaciones 'eager'
        };

        // Llamar a la función helper para subir el buffer a Cloudinary
        const cloudinaryResult = await uploadStreamToCloudinary(buffer, cloudinaryUploadOptions);

        // Crear el objeto de datos para guardar en MongoDB
        const mediaData = {
            originalName: originalname,
            filename: cloudinaryResult.public_id,       // Usar el public_id de Cloudinary como 'filename'
            url: cloudinaryResult.secure_url,          // Usar la secure_url de Cloudinary
            mimetype: mimetype,
            mediaType: resourceType === 'image' ? 'image' : (resourceType === 'video' ? 'video' : 'raw'),
            size: cloudinaryResult.bytes || originalSize, // Usar el tamaño reportado por Cloudinary, o el original si no está disponible
            uploadedBy: req.user._id,                  // ID del admin que subió el archivo
            cloudinaryPublicId: cloudinaryResult.public_id,
            cloudinaryResourceType: cloudinaryResult.resource_type,
        };

        // Guardar la información del archivo multimedia en la base de datos
        const newMedia = await Media.create(mediaData);

        res.status(201).json({ // 201 Created
            message: 'Archivo subido exitosamente a Cloudinary.',
            media: newMedia,
        });

    } catch (error) {
        console.error("Error durante la subida del archivo a Cloudinary:", error);
        res.status(500); // Internal Server Error
        // Proporcionar un mensaje de error más específico si es posible
        throw new Error(`Fallo al subir el archivo a Cloudinary: ${error.message || 'Error desconocido'}`);
    }
});

// @desc    Obtener todos los archivos multimedia (para el panel de admin)
// @route   GET /api/media
// @access  Private/Admin
const getAllUploadedMedia = asyncHandler(async (req, res) => {
    const mediaItems = await Media.find({})
        .populate('uploadedBy', 'username') // Mostrar el nombre de usuario del admin que subió
        .sort({ createdAt: -1 }); // Los más recientes primero
    res.status(200).json(mediaItems);
});

// @desc    Obtener un archivo multimedia por su ID
// @route   GET /api/media/:id
// @access  Private (Admin o Viewer, según se necesite en las rutas)
const getMediaDetailsById = asyncHandler(async (req, res) => {
    const media = await Media.findById(req.params.id).populate('uploadedBy', 'username');
    if (!media) {
        res.status(404); // Not Found
        throw new Error('Archivo multimedia no encontrado.');
    }
    res.status(200).json(media);
});

// @desc    Eliminar un archivo multimedia
// @route   DELETE /api/media/:id
// @access  Private/Admin
const deleteMediaFile = asyncHandler(async (req, res) => {
    const media = await Media.findById(req.params.id);

    if (!media) {
        res.status(404); // Not Found
        throw new Error('Archivo multimedia no encontrado.');
    }

    // Si el archivo tiene un cloudinaryPublicId, intentar eliminarlo de Cloudinary
    if (media.cloudinaryPublicId && process.env.CLOUDINARY_CLOUD_NAME) {
        try {
            // Usar la API de Cloudinary para eliminar el recurso
            await cloudinaryV2.uploader.destroy(media.cloudinaryPublicId, {
                resource_type: media.cloudinaryResourceType || (media.mediaType === 'video' ? 'video' : 'image')
            });
            console.log(`Media eliminada de Cloudinary: ${media.cloudinaryPublicId}`);
        } catch (error) {
            console.error(`Error al eliminar media de Cloudinary (${media.cloudinaryPublicId}):`, error.message);
            // Considerar si se debe continuar o devolver un error.
            // Por ahora, se registrará el error y se continuará con la eliminación de la DB.
            // En un sistema de producción, podrías querer reintentar o marcar el archivo para borrado manual.
        }
    }
    // Ya no hay lógica para borrar archivos locales, ya que todo se asume que está en Cloudinary.

    // Desasignar esta media de cualquier activador que la esté usando
    // Esto evita que los activadores apunten a media que ya no existe.
    await Activator.updateMany(
        { assignedMedia: media._id },
        { $set: { assignedMedia: null } }
    );
    // Considera emitir un evento de Socket.IO aquí para los visualizadores afectados por la desasignación.

    // Finalmente, eliminar la referencia del archivo multimedia de la base de datos
    await Media.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Archivo multimedia eliminado de Cloudinary y de la base de datos exitosamente.' });
});

module.exports = {
    uploadNewMedia,
    getAllUploadedMedia,
    getMediaDetailsById,
    deleteMediaFile,
};
