// backend/src/controllers/mediaController.js
const asyncHandler = require('express-async-handler');
const path = require('path');
const Media = require('../models/Media');
const Activator = require('../models/Activator');
const { cloudinaryV2 } = require('../middleware/uploadMiddleware');

const uploadStreamToCloudinary = (fileBuffer, options) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinaryV2.uploader.upload_stream(options, (error, result) => {
            if (error) return reject(error);
            resolve(result);
        });
        uploadStream.end(fileBuffer);
    });
};

// @desc    Subir nuevo archivo multimedia o registrar URL de página web
// @route   POST /api/media/upload
// @access  Private/Admin
const uploadNewMedia = asyncHandler(async (req, res) => {
    // Caso 1: Subida de archivo (imagen o video)
    if (req.file) {
        const { originalname, mimetype, buffer, size: originalSize } = req.file;

        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            res.status(500);
            throw new Error('Cloudinary no está configurado en el servidor.');
        }

        try {
            let folderName = 'easypanel_media/otros_archivos';
            let resourceType = 'auto';
            let detectedMediaType = '';

            if (mimetype.startsWith('image/')) {
                folderName = 'easypanel_media/imagenes';
                resourceType = 'image';
                detectedMediaType = 'image';
            } else if (mimetype.startsWith('video/')) {
                folderName = 'easypanel_media/videos';
                resourceType = 'video';
                detectedMediaType = 'video';
            } else {
                res.status(400);
                throw new Error('Tipo de archivo no soportado para subida directa. Solo imágenes o videos.');
            }

            const cloudinaryResult = await uploadStreamToCloudinary(buffer, {
                folder: folderName,
                resource_type: resourceType,
                public_id: `${path.parse(originalname).name.replace(/[^a-zA-Z0-9_]/g, '_')}-${Date.now()}`,
            });

            const mediaData = {
                originalName: originalname,
                filename: cloudinaryResult.public_id,
                url: cloudinaryResult.secure_url,
                mimetype: mimetype,
                mediaType: detectedMediaType,
                size: cloudinaryResult.bytes || originalSize,
                uploadedBy: req.user._id,
                cloudinaryPublicId: cloudinaryResult.public_id,
                cloudinaryResourceType: cloudinaryResult.resource_type,
            };
            const newMedia = await Media.create(mediaData);
            return res.status(201).json({
                message: 'Archivo subido exitosamente a Cloudinary.',
                media: newMedia,
            });

        } catch (error) {
            console.error("Error durante la subida del archivo a Cloudinary:", error);
            res.status(500);
            throw new Error(`Fallo al subir el archivo a Cloudinary: ${error.message || 'Error desconocido'}`);
        }
    } 
    // Caso 2: Registro de URL de página web
    else if (req.body.contentUrl && req.body.mediaTypeInput === 'webpage') {
        const { contentUrl, webpageTitle } = req.body;

        if (!contentUrl) {
            res.status(400);
            throw new Error('Se requiere la URL de la página web (contentUrl).');
        }
        // Validación simple de URL (puedes hacerla más robusta)
        try {
            new URL(contentUrl);
        } catch (_) {
            res.status(400);
            throw new Error('La URL proporcionada no es válida.');
        }

        const mediaData = {
            originalName: webpageTitle || contentUrl, // Usar título si se proporciona, sino la URL
            url: contentUrl,
            mediaType: 'webpage',
            uploadedBy: req.user._id,
            // Los campos como filename, mimetype, size, cloudinaryPublicId, etc.,
            // serán manejados por el pre-validate hook en el modelo Media.js
        };

        const newMedia = await Media.create(mediaData);
        return res.status(201).json({
            message: 'Página web registrada exitosamente.',
            media: newMedia,
        });
    } 
    // Caso 3: No se proporcionó ni archivo ni URL válida para webpage
    else {
        res.status(400);
        throw new Error('Por favor, selecciona un archivo para subir o proporciona una URL para una página web.');
    }
});

// ... (resto de las funciones: getAllUploadedMedia, getMediaDetailsById, deleteMediaFile)
// La función deleteMediaFile no necesita cambios importantes, ya que si es 'webpage',
// no tendrá cloudinaryPublicId y simplemente borrará la entrada de la base de datos.

const getAllUploadedMedia = asyncHandler(async (req, res) => {
    const mediaItems = await Media.find({})
        .populate('uploadedBy', 'username')
        .sort({ createdAt: -1 });
    res.status(200).json(mediaItems);
});

const getMediaDetailsById = asyncHandler(async (req, res) => {
    const media = await Media.findById(req.params.id).populate('uploadedBy', 'username');
    if (!media) {
        res.status(404);
        throw new Error('Archivo multimedia no encontrado.');
    }
    res.status(200).json(media);
});

const deleteMediaFile = asyncHandler(async (req, res) => {
    const media = await Media.findById(req.params.id);

    if (!media) {
        res.status(404);
        throw new Error('Contenido multimedia no encontrado.');
    }

    if (media.mediaType !== 'webpage' && media.cloudinaryPublicId && process.env.CLOUDINARY_CLOUD_NAME) {
        try {
            await cloudinaryV2.uploader.destroy(media.cloudinaryPublicId, {
                resource_type: media.cloudinaryResourceType || (media.mediaType === 'video' ? 'video' : 'image')
            });
            console.log(`Media eliminada de Cloudinary: ${media.cloudinaryPublicId}`);
        } catch (error) {
            console.error(`Error al eliminar media de Cloudinary (${media.cloudinaryPublicId}):`, error.message);
        }
    }

    await Activator.updateMany(
        { assignedMedia: media._id },
        { $set: { assignedMedia: null } }
    );

    await Media.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Contenido multimedia eliminado exitosamente.' });
});


module.exports = {
    uploadNewMedia,
    getAllUploadedMedia,
    getMediaDetailsById,
    deleteMediaFile,
};
