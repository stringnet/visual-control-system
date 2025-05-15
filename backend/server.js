require('dotenv').config(); // Carga las variables de .env al inicio
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path'); // Para servir archivos estáticos
const { Server } = require('socket.io');

const connectDB = require('./src/config/db');

// Importar Rutas
const authRoutes = require('./src/routes/authRoutes');
const mediaRoutes = require('./src/routes/mediaRoutes');
const activatorRoutes = require('./src/routes/activatorRoutes');
const { protect } = require('./src/middleware/authMiddleware'); // Middleware de protección

const app = express();
const server = http.createServer(app);

// Conectar a la Base de Datos
connectDB();

// Configuración de Orígenes Permitidos para CORS
const allowedOrigins = [
    process.env.ADMIN_FRONTEND_URL,
    process.env.VISUALIZER_FRONTEND_URL,
];
if (process.env.NODE_ENV === 'development') {
    // Permitir orígenes adicionales en desarrollo si es necesario
    // allowedOrigins.push('http://localhost:OTRO_PUERTO_DEV');
}

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`CORS: Origen bloqueado -> ${origin}`);
            callback(new Error('Origen no permitido por CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
}));

// Middlewares de Seguridad
app.use(helmet()); // Configura varias cabeceras HTTP de seguridad
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'",
            process.env.ADMIN_FRONTEND_URL,
            process.env.VISUALIZER_FRONTEND_URL
        ], // Permitir scripts de los frontends
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Permitir inline styles y fuentes de Google
        imgSrc: [
            "'self'",
            "data:",
            "blob:",
            `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/` // URLs de Cloudinary
        ],
        mediaSrc: [
            "'self'",
            "data:",
            "blob:",
            `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: [
            "'self'",
            `ws://localhost:${process.env.PORT || 3001}`, // WebSocket en desarrollo
            // Añade aquí tu URL de WebSocket en producción, ej: wss://tu-api.dominio.com
            process.env.ADMIN_FRONTEND_URL, // Necesario si el frontend hace polling o conexiones directas no WS
            process.env.VISUALIZER_FRONTEND_URL,
            "https://api.cloudinary.com" // Si subes directamente a Cloudinary desde el cliente
        ],
        frameSrc: ["'self'"], // Si usas iframes
        objectSrc: ["'none'"], // Deshabilitar plugins como Flash
        // upgradeInsecureRequests: [], // Considerar en producción si todo es HTTPS
    },
}));

// Middlewares para Parsear Peticiones
app.use(express.json()); // Para parsear application/json
app.use(express.urlencoded({ extended: true })); // Para parsear application/x-www-form-urlencoded

// Servir archivos estáticos desde la carpeta 'uploads' (si se usa almacenamiento local)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de Socket.IO
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    },
});

io.on('connection', (socket) => {
    console.log(`🔌 Usuario conectado a WebSocket: ${socket.id}`);

    socket.on('joinVisualizerRoom', (visualizerId) => {
        socket.join(visualizerId);
        console.log(`🚪 Socket ${socket.id} se unió a la sala: ${visualizerId}`);
    });

    socket.on('leaveVisualizerRoom', (visualizerId) => {
        socket.leave(visualizerId);
        console.log(`🚶 Socket ${socket.id} abandonó la sala: ${visualizerId}`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Usuario desconectado de WebSocket: ${socket.id}`);
    });
});

// Hacer 'io' accesible en las rutas/controladores
app.set('socketio', io);

// Definición de Rutas de la API
app.get('/api/health', (req, res) => res.status(200).json({ status: 'OK', message: 'Servidor saludable!' }));
app.use('/api/auth', authRoutes);
app.use('/api/media', protect, mediaRoutes); // `protect` asegura que el usuario esté autenticado
app.use('/api/activators', protect, activatorRoutes);

// Middleware de Manejo de Errores (Debe ser el último middleware)
app.use((err, req, res, next) => {
    console.error("❌ ERROR:", err.message);
    console.error(err.stack); // Para depuración más detallada

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';

    res.status(statusCode).json({
        message: message,
        // En desarrollo, podrías enviar el stack, pero nunca en producción
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en modo ${process.env.NODE_ENV} en el puerto ${PORT}`);
    console.log(`🔗 Admin Frontend esperado en: ${process.env.ADMIN_FRONTEND_URL}`);
    console.log(`🔗 Visualizer Frontend esperado en: ${process.env.VISUALIZER_FRONTEND_URL}`);
    if (process.env.CLOUDINARY_CLOUD_NAME) {
        console.log(`☁️ Cloudinary configurado para: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    } else {
        console.warn("⚠️ Cloudinary no está configurado. Se usará almacenamiento local para media si está implementado.");
    }
});

// Manejo de promesas no capturadas y errores no controlados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Considera cerrar el servidor elegantemente aquí en producción
    // server.close(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Considera cerrar el servidor elegantemente aquí en producción
    // server.close(() => process.exit(1));
});
