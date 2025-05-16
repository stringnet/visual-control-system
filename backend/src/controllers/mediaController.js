// backend/src/controllers/mediaController.js
const asyncHandler = require('express-async-handler');
const path = require('path');
const Media = require('../models/Media');
const Activator = require('../models/Activator');
const { cloudinaryV2 } = require('../middleware/uploadMiddleware'); // Importamos cloudinaryV2 configurado

// Función helper para subir stream/buffer a Cloudinary
const uploadStreamToCloudinary = (fileBuffer, options) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinaryV2.uploader.upload_stream(options, (error, result) => {
            if (error) {
                return reject(error);
            }
            resolve(result);
        });
        uploadStream.end(fileBuffer);
    });
};

// @desc    Subir nuevo contenido multimedia (imagen, video, webpage, o pixelmap)
// @route   POST /api/media/upload
// @access  Private/Admin
const uploadNewMedia = asyncHandler(async (req, res) => {
    const { mediaTypeInput, contentUrl, webpageTitle, pixelMapName, pixelMapColors } = req.body;
    const files = req.files; // req.files será un objeto si usas upload.fields (ej. { logoFile: [file], audioFile: [file] })

    // CASO 1: Subida de archivo tradicional (imagen o video)
    // 'mediaFile' es el nombre del campo que usamos para subidas de imagen/video simples
    if (files && files.mediaFile && files.mediaFile[0]) {
        const file = files.mediaFile[0];
        const { originalname, mimetype, buffer, size: originalSize } = file;

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
    // CASO 2: Registro de URL de página web
    else if (mediaTypeInput === 'webpage') {
        if (!contentUrl) {
            res.status(400);
            throw new Error('Se requiere la URL de la página web (contentUrl).');
        }
        try { new URL(contentUrl); } catch (_) {
            res.status(400);
            throw new Error('La URL proporcionada no es válida.');
        }

        const mediaData = {
            originalName: webpageTitle || contentUrl,
            url: contentUrl,
            mediaType: 'webpage',
            uploadedBy: req.user._id,
        };
        const newMedia = await Media.create(mediaData);
        return res.status(201).json({
            message: 'Página web registrada exitosamente.',
            media: newMedia,
        });
    }
    // CASO 3: Creación de Pixel Map
    else if (mediaTypeInput === 'pixelmap') {
        if (!pixelMapName) {
            res.status(400);
            throw new Error('Se requiere un nombre para la configuración del Pixel Map (pixelMapName).');
        }

        const parsedColors = pixelMapColors ? JSON.parse(pixelMapColors) : [];
        if (!Array.isArray(parsedColors) || !parsedColors.every(color => typeof color === 'string' && /^#[0-9A-F]{6}$/i.test(color))) {
            res.status(400);
            throw new Error('El formato de colores es incorrecto. Debe ser un array de strings hexadecimales (ej. ["#FF0000", "#00FF00"]).');
        }

        const pixelMapConfig = { colors: parsedColors };
        let logoFile, audioFile;

        if (files && files.logoFile && files.logoFile[0]) {
            logoFile = files.logoFile[0];
        }
        if (files && files.audioFile && files.audioFile[0]) {
            audioFile = files.audioFile[0];
        }
        
        try {
            if (logoFile) {
                if (!logoFile.mimetype.startsWith('image/png')) { // Forzar PNG para transparencia
                    res.status(400);
                    throw new Error('El archivo del logo debe ser en formato PNG para asegurar transparencia.');
                }
                const logoResult = await uploadStreamToCloudinary(logoFile.buffer, {
                    folder: 'easypanel_media/pixelmap_assets',
                    resource_type: 'image',
                    public_id: `logo_${pixelMapName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
                });
                pixelMapConfig.logoUrl = logoResult.secure_url;
                pixelMapConfig.logoCloudinaryPublicId = logoResult.public_id;
            }

            if (audioFile) {
                 if (!audioFile.mimetype.startsWith('audio/')) {
                    res.status(400);
                    throw new Error('El archivo de audio no es un tipo de audio válido.');
                }
                const audioResult = await uploadStreamToCloudinary(audioFile.buffer, {
                    folder: 'easypanel_media/pixelmap_assets',
                    resource_type: 'video', // Cloudinary trata audio como 'video' para algunas funcionalidades
                    public_id: `audio_${pixelMapName.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
                });
                pixelMapConfig.audioUrl = audioResult.secure_url;
                pixelMapConfig.audioCloudinaryPublicId = audioResult.public_id;
            }
            
            const mediaData = {
                originalName: pixelMapName,
                mediaType: 'pixelmap',
                pixelMapConfig: pixelMapConfig,
                uploadedBy: req.user._id,
            };
            const newMedia = await Media.create(mediaData);
            return res.status(201).json({
                message: 'Configuración de Pixel Map creada exitosamente.',
                media: newMedia,
            });

        } catch (error) {
            console.error("Error al crear Pixel Map o subir assets:", error);
            // Intentar borrar archivos ya subidos a Cloudinary si algo falla a mitad de camino
            if (pixelMapConfig.logoCloudinaryPublicId) {
                await cloudinaryV2.uploader.destroy(pixelMapConfig.logoCloudinaryPublicId, { resource_type: 'image' }).catch(e => console.error("Error al borrar logo de fallback", e));
            }
            if (pixelMapConfig.audioCloudinaryPublicId) {
                await cloudinaryV2.uploader.destroy(pixelMapConfig.audioCloudinaryPublicId, { resource_type: 'video' }).catch(e => console.error("Error al borrar audio de fallback", e));
            }
            res.status(500);
            throw new Error(`Fallo al crear el Pixel Map: ${error.message || 'Error desconocido'}`);
        }
    }
    // CASO 4: No se proporcionó información válida
    else {
        res.status(400);
        throw new Error('Por favor, selecciona un archivo, proporciona una URL de página web, o configura un Pixel Map.');
    }
});

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
        throw new Error('Contenido multimedia no encontrado.');
    }
    res.status(200).json(media);
});

const deleteMediaFile = asyncHandler(async (req, res) => {
    const media = await Media.findById(req.params.id);

    if (!media) {
        res.status(404);
        throw new Error('Contenido multimedia no encontrado.');
    }

    // Eliminar de Cloudinary si es imagen o video
    if (media.mediaType === 'image' || media.mediaType === 'video') {
        if (media.cloudinaryPublicId && process.env.CLOUDINARY_CLOUD_NAME) {
            try {
                await cloudinaryV2.uploader.destroy(media.cloudinaryPublicId, {
                    resource_type: media.cloudinaryResourceType
                });
                console.log(`Media eliminada de Cloudinary: ${media.cloudinaryPublicId}`);
            } catch (error) {
                console.error(`Error al eliminar media de Cloudinary (${media.cloudinaryPublicId}):`, error.message);
            }
        }
    } 
    // Eliminar assets de Cloudinary si es pixelmap
    else if (media.mediaType === 'pixelmap' && media.pixelMapConfig) {
        if (media.pixelMapConfig.logoCloudinaryPublicId) {
            try {
                await cloudinaryV2.uploader.destroy(media.pixelMapConfig.logoCloudinaryPublicId, { resource_type: 'image' });
                console.log(`Logo de Pixel Map eliminado de Cloudinary: ${media.pixelMapConfig.logoCloudinaryPublicId}`);
            } catch (error) {
                console.error(`Error al eliminar logo de Pixel Map de Cloudinary:`, error.message);
            }
        }
        if (media.pixelMapConfig.audioCloudinaryPublicId) {
            try {
                await cloudinaryV2.uploader.destroy(media.pixelMapConfig.audioCloudinaryPublicId, { resource_type: 'video' }); // 'video' para audio en Cloudinary
                console.log(`Audio de Pixel Map eliminado de Cloudinary: ${media.pixelMapConfig.audioCloudinaryPublicId}`);
            } catch (error) {
                console.error(`Error al eliminar audio de Pixel Map de Cloudinary:`, error.message);
            }
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
