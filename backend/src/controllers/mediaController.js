const asyncHandler = require('express-async-handler');
const fs = require('fs'); // Para borrar archivos locales
const path = require('path'); // Para construir rutas de archivos locales
const Media = require('../models/Media');
const Activator = require('../models/Activator'); // Para desasignar media
const { cloudinaryV2 } = require('../middleware/uploadMiddleware'); // Para borrar de Cloudinary

// @desc    Subir un nuevo archivo multimedia
// @route   POST /api/media/upload
// @access  Private/Admin
const uploadNewMedia = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('Por favor, selecciona un archivo para subir.');
    }

    const { originalname, mimetype, size, path: filePath, filename } = req.file;

    const mediaData = {
        originalName: originalname,
        filename: filename, // Para Cloudinary, filename es public_id. Para local, es el nombre en disco.
        url: filePath,    // Para Cloudinary, path es secure_url. Para local, es la ruta relativa.
        mimetype: mimetype,
        mediaType: mimetype.startsWith('image/') ? 'image' : 'video',
        size: size,
        uploadedBy: req.user._id, // Usuario admin que subió el archivo
    };

    // Si se usó Cloudinary, req.file tendrá propiedades específicas
    if (req.file.storage instanceof require('multer-storage-cloudinary').CloudinaryStorage) {
        mediaData.cloudinaryPublicId = req.file.filename; // 'filename' de Cloudinary es el public_id
        mediaData.cloudinaryResourceType = req.file.resource_type;
        mediaData.url = req.file.path; // 'path' de Cloudinary es la URL segura
    } else {
        // Para almacenamiento local, la URL es relativa a la carpeta 'uploads'
        mediaData.url = `/uploads/${filename}`;
    }

    const newMedia = await Media.create(mediaData);

    res.status(201).json({
        message: 'Archivo subido exitosamente.',
        media: newMedia,
    });
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
// @access  Private (Admin o Viewer, según se necesite)
const getMediaDetailsById = asyncHandler(async (req, res) => {
    const media = await Media.findById(req.params.id).populate('uploadedBy', 'username');
    if (!media) {
        res.status(404);
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
        res.status(404);
        throw new Error('Archivo multimedia no encontrado.');
    }

    // Si está en Cloudinary, eliminarlo de allí también
    if (media.cloudinaryPublicId && process.env.CLOUDINARY_URL) {
        try {
            await cloudinaryV2.uploader.destroy(media.cloudinaryPublicId, {
                resource_type: media.cloudinaryResourceType || (media.mediaType === 'video' ? 'video' : 'image')
            });
            console.log(`Media eliminada de Cloudinary: ${media.cloudinaryPublicId}`);
        } catch (error) {
            console.error('Error al eliminar de Cloudinary:', error);
            // Considerar si continuar con la eliminación de la DB o no
            // Por ahora, continuaremos para mantener la consistencia si Cloudinary falla
        }
    } else if (!media.cloudinaryPublicId && media.url.startsWith('/uploads/')) {
        // Si es local, eliminar el archivo del servidor
        const localFilePath = path.join(__dirname, '../../', media.url);
        try {
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
                console.log(`Media local eliminada: ${localFilePath}`);
            }
        } catch (error) {
            console.error('Error al eliminar archivo local:', error);
        }
    }

    // Desasignar esta media de cualquier activador que la esté usando
    await Activator.updateMany(
        { assignedMedia: media._id },
        { $set: { assignedMedia: null } }
    );
    // Podrías emitir eventos de Socket.IO aquí para los visualizadores afectados

    // Finalmente, eliminar de la base de datos
    await Media.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Archivo multimedia eliminado y desasignado exitosamente.' });
});

module.exports = {
    uploadNewMedia,
    getAllUploadedMedia,
    getMediaDetailsById,
    deleteMediaFile,
};
