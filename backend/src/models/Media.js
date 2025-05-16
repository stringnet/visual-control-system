// backend/src/models/Media.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    originalName: { // Para 'pixelmap', será un nombre descriptivo para la configuración
        type: String,
        required: [true, 'El nombre original o título es obligatorio.'],
    },
    filename: { 
        type: String,
    },
    url: { // Para 'pixelmap', este campo podría no usarse directamente o usarse para el logo o audio si no tenemos campos separados
        type: String,
        // required: [true, 'La URL del contenido es obligatoria.'], // No siempre para pixelmap
    },
    mimetype: { 
        type: String,
    },
    mediaType: { 
        type: String,
        enum: ['image', 'video', 'webpage', 'pixelmap'], // Añadido 'pixelmap'
        required: true,
    },
    size: { 
        type: Number,
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    // Campos específicos de Cloudinary para imágenes/videos
    cloudinaryPublicId: { type: String },
    cloudinaryResourceType: { type: String },

    // Nueva configuración específica para Pixel Maps
    pixelMapConfig: {
        colors: { // Array de strings con códigos de color hexadecimales
            type: [String],
            default: [],
        },
        logoUrl: { // URL del logo (almacenado en Cloudinary)
            type: String,
            default: '',
        },
        logoCloudinaryPublicId: { type: String }, // Para poder borrar el logo de Cloudinary
        audioUrl: { // URL del archivo de audio (almacenado en Cloudinary)
            type: String,
            default: '',
        },
        audioCloudinaryPublicId: { type: String }, // Para poder borrar el audio de Cloudinary
        // Podríamos añadir más campos de configuración aquí en el futuro (ej. velocidad, tipo de efecto)
    }
}, {
    timestamps: true,
});

mediaSchema.pre('validate', function(next) {
  if (this.mediaType === 'pixelmap') {
    if (!this.originalName) {
        return next(new Error('El nombre (originalName) es obligatorio para pixelmaps.'));
    }
    // Para 'pixelmap', ciertos campos no son necesarios o tienen valores por defecto
    if (!this.filename) this.filename = `pixelmap_config_${this.originalName.replace(/\s+/g, '_').toLowerCase()}`;
    if (!this.mimetype) this.mimetype = 'application/json'; // Representa una configuración
    if (this.size === undefined || this.size === null) this.size = 0; 
    // El campo 'url' principal podría quedar vacío o apuntar al logo/audio si se desea,
    // pero es mejor usar los campos dedicados en pixelMapConfig.
    if (!this.url && this.pixelMapConfig?.logoUrl) this.url = this.pixelMapConfig.logoUrl;
    else if (!this.url && this.pixelMapConfig?.audioUrl) this.url = this.pixelMapConfig.audioUrl;

  } else if (this.mediaType === 'webpage') {
    if (!this.filename) this.filename = 'webpage_link';
    if (!this.mimetype) this.mimetype = 'text/html';
    if (this.size === undefined || this.size === null) this.size = 0;
  } else { // Para 'image' y 'video'
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
