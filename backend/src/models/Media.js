const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    originalName: { // Nombre original del archivo
        type: String,
        required: [true, 'El nombre original del archivo es obligatorio.'],
    },
    filename: { // Nombre del archivo en el servidor o public_id de Cloudinary
        type: String,
        required: true,
    },
    url: { // URL pública para acceder al archivo
        type: String,
        required: [true, 'La URL del archivo es obligatoria.'],
    },
    mimetype: { // Tipo MIME (e.g., 'image/jpeg', 'video/mp4')
        type: String,
        required: true,
    },
    mediaType: { // 'image' o 'video'
        type: String,
        enum: ['image', 'video'],
        required: true,
    },
    size: { // Tamaño en bytes
        type: Number,
        required: true,
    },
    uploadedBy: { // Quién subió el archivo (admin)
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    // Campos específicos si usas Cloudinary
    cloudinaryPublicId: {
        type: String,
    },
    cloudinaryResourceType: { // 'image', 'video', 'raw', 'auto'
        type: String,
    }
}, {
    timestamps: true,
});

const Media = mongoose.model('Media', mediaSchema);
module.exports = Media;
