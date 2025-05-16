// backend/src/controllers/activatorController.js
const asyncHandler = require('express-async-handler');
const Activator = require('../models/Activator');
const Media = require('../models/Media');

// ... (otras funciones como createNewActivator, getAllActivatorsAdmin, etc. se mantienen igual)

// @desc    Asignar o cambiar media a un activador
// @route   PATCH /api/activators/:id/assign-media
// @access  Private/Admin
const assignMediaToActivator = asyncHandler(async (req, res) => {
    const { mediaId } = req.body; 
    const activatorId = req.params.id;

    const activator = await Activator.findById(activatorId);
    if (!activator) {
        res.status(404);
        throw new Error('Activador no encontrado.');
    }

    let mediaToAssign = null;
    if (mediaId) { 
        mediaToAssign = await Media.findById(mediaId);
        if (!mediaToAssign) {
            res.status(404);
            throw new Error('Contenido multimedia a asignar no encontrado.');
        }
        activator.assignedMedia = mediaToAssign._id;
    } else { 
        activator.assignedMedia = null;
    }

    const updatedActivator = await activator.save();
    // Volver a popular para tener la información completa de la media asignada
    await updatedActivator.populate('assignedMedia'); 

    const io = req.app.get('socketio');
    if (io) {
        let contentToSend = null;
        if (activator.isActive && updatedActivator.assignedMedia) { // Usar updatedActivator.assignedMedia
            const assignedContent = updatedActivator.assignedMedia;
            if (assignedContent.mediaType === 'pixelmap') {
                contentToSend = {
                    mediaType: assignedContent.mediaType,
                    pixelMapConfig: assignedContent.pixelMapConfig, // Enviar la configuración completa
                    originalName: assignedContent.originalName, // Opcional, pero puede ser útil
                };
            } else { // Para image, video, webpage
                contentToSend = {
                    url: assignedContent.url,
                    mediaType: assignedContent.mediaType,
                    originalName: assignedContent.originalName,
                };
            }
        }
        
        io.to(activator.visualizerId).emit('contentUpdate', {
            visualizerId: activator.visualizerId,
            mediaContent: contentToSend,
        });
        console.log(`📢 Evento 'contentUpdate' emitido a sala ${activator.visualizerId} con contenido:`, contentToSend);
    }

    // Para la respuesta HTTP, también popular la media para que el frontend del admin la reciba actualizada
    const finalUpdatedActivator = await Activator.findById(updatedActivator._id)
                                        .populate('assignedMedia')
                                        .populate('createdBy', 'username');
    res.status(200).json(finalUpdatedActivator);
});


// Modificar también getVisualizerDisplayContent para que devuelva el pixelMapConfig
// @desc    Obtener contenido para un visualizador específico
// @route   GET /api/activators/content/:visualizerId
// @access  Public
const getVisualizerDisplayContent = asyncHandler(async (req, res) => {
    const { visualizerId } = req.params;

    const activator = await Activator.findOne({ visualizerId: visualizerId, isActive: true })
        .populate('assignedMedia'); // Popular toda la información de assignedMedia

    if (!activator) {
        return res.status(200).json({
            visualizerId: visualizerId,
            mediaContent: null,
            message: `No hay activador activo para '${visualizerId}'.`
        });
    }

    if (!activator.assignedMedia) {
        return res.status(200).json({
            visualizerId: activator.visualizerId,
            mediaContent: null,
            message: 'Activador encontrado, pero no hay contenido multimedia asignado.',
        });
    }

    let contentResponse;
    const assignedContent = activator.assignedMedia;

    if (assignedContent.mediaType === 'pixelmap') {
        contentResponse = {
            mediaType: assignedContent.mediaType,
            pixelMapConfig: assignedContent.pixelMapConfig,
            originalName: assignedContent.originalName,
        };
    } else {
        contentResponse = {
            url: assignedContent.url,
            mediaType: assignedContent.mediaType,
            originalName: assignedContent.originalName,
        };
    }

    res.status(200).json({
        visualizerId: activator.visualizerId,
        mediaContent: contentResponse,
    });
});


// Asegúrate de exportar todas las funciones necesarias
module.exports = {
    createNewActivator,
    getAllActivatorsAdmin,
    getActivatorDetailsById,
    updateActivatorInfo,
    assignMediaToActivator,
    deleteExistingActivator,
    getVisualizerDisplayContent,
};
