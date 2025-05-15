const mongoose = require('mongoose');

const activatorSchema = new mongoose.Schema({
    name: { // Nombre descriptivo del activador
        type: String,
        required: [true, 'El nombre del activador es obligatorio.'],
        trim: true,
    },
    visualizerId: { // ID único para el frontend (ej. 'visualizer1', 'main-screen')
        type: String,
        required: [true, 'El ID del visualizador es obligatorio.'],
        unique: true,
        trim: true,
    },
    assignedMedia: { // Media actualmente asignada
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
        default: null,
    },
    description: { // Descripción opcional
        type: String,
        trim: true,
    },
    isActive: { // Para habilitar/deshabilitar el activador
        type: Boolean,
        default: true,
    },
    createdBy: { // Admin que creó/gestionó este activador
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    }
}, {
    timestamps: true,
});

const Activator = mongoose.model('Activator', activatorSchema);
module.exports = Activator;
