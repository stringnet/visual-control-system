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
        createdBy: req.user._id, // Admin que crea el activador
        assignedMedia: null, // Inicialmente sin media asignada
    });

    res.status(201).json(activator);
});

// @desc    Obtener todos los activadores (para el panel de admin)
// @route   GET /api/activators
// @access  Private/Admin
const getAllActivatorsAdmin = asyncHandler(async (req, res) => {
    const activators = await Activator.find({})
        .populate('assignedMedia', 'url mediaType originalName filename') // Trae info de la media
        .populate('createdBy', 'username')
        .sort({ name: 1 }); // Ordenar alfabéticamente por nombre
    res.status(200).json(activators);
});

// @desc    Obtener un activador por su ID (para editar en admin)
// @route   GET /api/activators/:id
// @access  Private/Admin
const getActivatorDetailsById = asyncHandler(async (req, res) => {
    const activator = await Activator.findById(req.params.id)
        .populate('assignedMedia', 'url mediaType originalName filename')
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
    const { name, description, isActive, visualizerId } = req.body;
    const activator = await Activator.findById(req.params.id);

    if (!activator) {
        res.status(404);
        throw new Error('Activador no encontrado.');
    }

    // Verificar si el nuevo visualizerId ya está en uso por OTRO activador
    if (visualizerId && visualizerId !== activator.visualizerId) {
        const visualizerIdExists = await Activator.findOne({ visualizerId, _id: { $ne: activator._id } });
        if (visualizerIdExists) {
            res.status(400);
            throw new Error(`El ID de visualizador '${visualizerId}' ya está en uso por otro activador.`);
        }
        activator.visualizerId = visualizerId;
    }

    if (name) activator.name = name;
    if (description !== undefined) activator.description = description; // Permitir string vacío
    if (typeof isActive === 'boolean') activator.isActive = isActive;

    const updatedActivator = await activator.save();
    await updatedActivator.populate('assignedMedia', 'url mediaType originalName filename');

    // Si visualizerId cambió o isActive cambió a false, notificar al visualizador antiguo
    // y también al nuevo si el contenido es relevante
    const io = req.app.get('socketio');
    if (io) {
        // Implementar lógica de notificación de Socket.IO más detallada si es necesario
        // Por ahora, la asignación de media se encarga de la actualización de contenido principal
    }

    res.status(200).json(updatedActivator);
});

// @desc    Asignar o cambiar media a un activador
// @route   PATCH /api/activators/:id/assign-media
// @access  Private/Admin
const assignMediaToActivator = asyncHandler(async (req, res) => {
    const { mediaId } = req.body; // mediaId puede ser null para desasignar
    const activatorId = req.params.id;

    const activator = await Activator.findById(activatorId);
    if (!activator) {
        res.status(404);
        throw new Error('Activador no encontrado.');
    }

    let mediaToAssign = null;
    if (mediaId) { // Si se proporciona un mediaId, intentar asignarlo
        mediaToAssign = await Media.findById(mediaId);
        if (!mediaToAssign) {
            res.status(404);
            throw new Error('Archivo multimedia a asignar no encontrado.');
        }
        activator.assignedMedia = mediaToAssign._id;
    } else { // Si mediaId es null o no se proporciona, desasignar
        activator.assignedMedia = null;
    }

    const updatedActivator = await activator.save();
    await updatedActivator.populate('assignedMedia', 'url mediaType originalName filename');

    // Emitir evento a través de Socket.IO a la sala específica del visualizador
    const io = req.app.get('socketio');
    if (io) {
        let contentToSend = null;
        if (activator.isActive && mediaToAssign) {
            contentToSend = {
                url: mediaToAssign.url,
                mediaType: mediaToAssign.mediaType,
            };
        }
        io.to(activator.visualizerId).emit('contentUpdate', {
            visualizerId: activator.visualizerId,
            mediaContent: contentToSend, // Envía null si no hay media o está inactivo
        });
        console.log(`📢 Evento 'contentUpdate' emitido a sala ${activator.visualizerId} con media: ${contentToSend ? contentToSend.url : 'ninguna'}`);
    }

    res.status(200).json(updatedActivator);
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

    // Notificar al visualizador que su contenido ha sido eliminado (o ya no existe activador)
    const io = req.app.get('socketio');
    if (io) {
        io.to(visualizerIdToDeleteUpdateFor).emit('contentUpdate', {
            visualizerId: visualizerIdToDeleteUpdateFor,
            mediaContent: null, // Indicar que no hay contenido
            message: "El activador para este visualizador ha sido eliminado."
        });
        console.log(`📢 Evento 'contentUpdate' (eliminación) emitido a sala ${visualizerIdToDeleteUpdateFor}`);
    }

    res.status(200).json({ message: 'Activador eliminado exitosamente.' });
});

// @desc    Obtener contenido para un visualizador específico (usado por el frontend del visualizador)
// @route   GET /api/activators/content/:visualizerId
// @access  Private/Viewer (o Admin)
const getVisualizerDisplayContent = asyncHandler(async (req, res) => {
    const { visualizerId } = req.params;

    const activator = await Activator.findOne({ visualizerId: visualizerId, isActive: true })
        .populate('assignedMedia', 'url mediaType');

    if (!activator) {
        // No se encontró activador o no está activo, pero el visualizador es válido
        return res.status(200).json({ // Devuelve 200 para que el visualizador sepa que no hay error, solo no hay contenido
            visualizerId: visualizerId,
            mediaContent: null,
            message: `No hay contenido activo para el visualizador '${visualizerId}'.`
        });
    }

    if (!activator.assignedMedia) {
        // Activador existe y está activo, pero no tiene media asignada
        return res.status(200).json({
            visualizerId: activator.visualizerId,
            mediaContent: null,
            message: 'Activador encontrado, pero no hay contenido multimedia asignado.',
        });
    }

    res.status(200).json({
        visualizerId: activator.visualizerId,
        mediaContent: {
            url: activator.assignedMedia.url,
            mediaType: activator.assignedMedia.mediaType,
        },
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
