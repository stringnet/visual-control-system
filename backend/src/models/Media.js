// backend/src/models/Media.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    originalName: { // Para 'webpage', podría ser el título de la página o la URL misma
        type: String,
        required: [true, 'El nombre original o título es obligatorio.'],
    },
    filename: { // No aplicable directamente a 'webpage', pero el schema lo requiere. Puede ser un placeholder.
        type: String,
        // required: true, // Ya no es estrictamente requerido si es webpage
    },
    url: { // URL pública para acceder al archivo (Cloudinary) o la URL de la página web
        type: String,
        required: [true, 'La URL del contenido es obligatoria.'],
    },
    mimetype: { // Tipo MIME (e.g., 'image/jpeg', 'video/mp4', o 'text/html' para webpage)
        type: String,
        // required: true, // No siempre aplicable para 'webpage' de forma tradicional
    },
    mediaType: { // 'image', 'video', o 'webpage'
        type: String,
        enum: ['image', 'video', 'webpage'], // Añadido 'webpage'
        required: true,
    },
    size: { // Tamaño en bytes, no aplicable para 'webpage'
        type: Number,
        // required: true,
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    cloudinaryPublicId: {
        type: String,
    },
    cloudinaryResourceType: {
        type: String,
    }
}, {
    timestamps: true,
});

// Hacemos algunos campos no requeridos si el tipo es 'webpage'
mediaSchema.pre('validate', function(next) {
  if (this.mediaType === 'webpage') {
    // Para 'webpage', ciertos campos no son necesarios o tienen valores por defecto
    if (!this.filename) this.filename = 'webpage_link';
    if (!this.mimetype) this.mimetype = 'text/html'; // Un mimetype genérico para URLs
    if (this.size === undefined || this.size === null) this.size = 0; // Tamaño no aplicable
  } else {
    // Para 'image' y 'video', mantener los requisitos originales si es necesario
    if (!this.filename) {
        return next(new Error('El nombre del archivo (filename) es obligatorio para imágenes/videos.'));
    }
    if (!this.mimetype) {
        return next(new Error('El mimetype es obligatorio para imágenes/videos.'));
    }
     if (this.size === undefined || this.size === null) {
        return next(new Error('El tamaño (size) es obligatorio para imágenes/videos.'));
    }
  }
  next();
});


const Media = mongoose.model('Media', mediaSchema);
module.exports = Media;
