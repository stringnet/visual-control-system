// backend/src/controllers/activatorController.js
const asyncHandler = require('express-async-handler');
const Activator = require('../models/Activator');
const Media = require('../models/Media'); // Para validar si la media existe

// @desc    Crear un nuevo activador
// @route   POST /api/activators
// @access  Private/Admin
const createNewActivator = asyncHandler(async (req, res) => {
    const { name, visualizerId, description, isActive } = req.body;

    if (!name || !visualizerId) {
        res.status(400);
        throw new Error('El nombre y el ID del visualizador son obligatorios.');
    }

    const visualizerIdExists = await Activator.findOne({ visualizerId });
    if (visualizerIdExists) {
        res.status(400);
        throw new Error(`El ID de visualizador '${visualizerId}' ya está en uso.`);
    }

    const activator = await Activator.create({
        name,
        visualizerId,
        description,
        isActive: typeof isActive === 'boolean' ? isActive : true,
        createdBy: req.user._id, 
        assignedMedia: null, 
    });

    res.status(201).json(activator);
});

// @desc    Obtener todos los activadores (para el panel de admin)
// @route   GET /api/activators
// @access  Private/Admin
const getAllActivatorsAdmin = asyncHandler(async (req, res) => {
    const activators = await Activator.find({})
        .populate('assignedMedia') // Trae info de la media
        .populate('createdBy', 'username')
        .sort({ name: 1 }); 
    res.status(200).json(activators);
});

// @desc    Obtener un activador por su ID (para editar en admin)
// @route   GET /api/activators/:id
// @access  Private/Admin
const getActivatorDetailsById = asyncHandler(async (req, res) => {
    const activator = await Activator.findById(req.params.id)
        .populate('assignedMedia')
        .populate('createdBy', 'username');

    if (!activator) {
        res.status(404);
        throw new Error('Activador no encontrado.');
    }
    res.status(200).json(activator);
});

// @desc    Actualizar detalles de un activador (nombre, descripción, estado activo)
// @route   PUT /api/activators/:id
// @access  Private/Admin
const updateActivatorInfo = asyncHandler(async (req, res) => {
    const { name, description, isActive, visualizerId: newVisualizerId } = req.body; // Renombrado para claridad
    const activator = await Activator.findById(req.params.id);

    if (!activator) {
        res.status(404);
        throw new Error('Activador no encontrado.');
    }

    // Verificar si el nuevo visualizerId ya está en uso por OTRO activador
    if (newVisualizerId && newVisualizerId !== activator.visualizerId) {
        const visualizerIdExists = await Activator.findOne({ visualizerId: newVisualizerId, _id: { $ne: activator._id } });
        if (visualizerIdExists) {
            res.status(400);
            throw new Error(`El ID de visualizador '${newVisualizerId}' ya está en uso por otro activador.`);
        }
        activator.visualizerId = newVisualizerId;
    }

    if (name) activator.name = name;
    if (description !== undefined) activator.description = description;
    if (typeof isActive === 'boolean') activator.isActive = isActive;

    const updatedActivator = await activator.save();
    await updatedActivator.populate('assignedMedia');

    // Aquí podrías emitir un evento de Socket.IO si el estado 'isActive' o 'visualizerId' cambia,
    // para que los visualizadores afectados puedan reaccionar.
    // Por ejemplo, si isActive pasa a false, el visualizador debería dejar de mostrar contenido.
    const io = req.app.get('socketio');
    if (io && (typeof isActive === 'boolean' || (newVisualizerId && newVisualizerId !== activator.visualizerId))) {
        // Si se desactiva, enviar null como contenido
        // Si cambia el ID, el antiguo visualizador podría necesitar una actualización a null
        // y el nuevo (si ya está conectado) podría necesitar el contenido actual.
        // Esta lógica puede ser compleja, por ahora nos enfocamos en la asignación de media.
        // La lógica de `assignMediaToActivator` ya maneja la emisión de `contentUpdate`.
    }


    res.status(200).json(updatedActivator);
});

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

    const updatedActivatorWithMediaId = await activator.save();
    // Volver a popular para tener la información completa de la media asignada para la emisión del socket
    const populatedActivatorForSocket = await Activator.findById(updatedActivatorWithMediaId._id).populate('assignedMedia');

    const io = req.app.get('socketio');
    if (io) {
        let contentToSend = null;
        if (populatedActivatorForSocket.isActive && populatedActivatorForSocket.assignedMedia) {
            const assignedContent = populatedActivatorForSocket.assignedMedia;
            if (assignedContent.mediaType === 'pixelmap') {
                contentToSend = {
                    mediaType: assignedContent.mediaType,
                    pixelMapConfig: assignedContent.pixelMapConfig,
                    originalName: assignedContent.originalName,
                };
            } else { // Para image, video, webpage
                contentToSend = {
                    url: assignedContent.url,
                    mediaType: assignedContent.mediaType,
                    originalName: assignedContent.originalName,
                };
            }
        }
        
        io.to(populatedActivatorForSocket.visualizerId).emit('contentUpdate', {
            visualizerId: populatedActivatorForSocket.visualizerId,
            mediaContent: contentToSend,
        });
        console.log(`📢 Evento 'contentUpdate' emitido a sala ${populatedActivatorForSocket.visualizerId} con contenido:`, contentToSend);
    }

    // Para la respuesta HTTP, también popular la media para que el frontend del admin la reciba actualizada
    const finalUpdatedActivatorForResponse = await Activator.findById(updatedActivatorWithMediaId._id)
                                        .populate('assignedMedia')
                                        .populate('createdBy', 'username');
    res.status(200).json(finalUpdatedActivatorForResponse);
});

// @desc    Eliminar un activador
// @route   DELETE /api/activators/:id
// @access  Private/Admin
const deleteExistingActivator = asyncHandler(async (req, res) => {
    const activator = await Activator.findById(req.params.id);

    if (!activator) {
        res.status(404);
        throw new Error('Activador no encontrado.');
    }

    const visualizerIdToDeleteUpdateFor = activator.visualizerId;
    await Activator.findByIdAndDelete(req.params.id);

    const io = req.app.get('socketio');
    if (io) {
        io.to(visualizerIdToDeleteUpdateFor).emit('contentUpdate', {
            visualizerId: visualizerIdToDeleteUpdateFor,
            mediaContent: null,
            message: "El activador para este visualizador ha sido eliminado."
        });
        console.log(`📢 Evento 'contentUpdate' (eliminación) emitido a sala ${visualizerIdToDeleteUpdateFor}`);
    }

    res.status(200).json({ message: 'Activador eliminado exitosamente.' });
});

// @desc    Obtener contenido para un visualizador específico
// @route   GET /api/activators/content/:visualizerId
// @access  Public
const getVisualizerDisplayContent = asyncHandler(async (req, res) => {
    const { visualizerId } = req.params;

    const activator = await Activator.findOne({ visualizerId: visualizerId, isActive: true })
        .populate('assignedMedia');

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

module.exports = {
    createNewActivator,
    getAllActivatorsAdmin,
    getActivatorDetailsById,
    updateActivatorInfo,
    assignMediaToActivator,
    deleteExistingActivator,
    getVisualizerDisplayContent,
};
