// backend/server.js
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const mediaRoutes = require('./src/routes/mediaRoutes');
const activatorRoutes = require('./src/routes/activatorRoutes');
const { protect } = require('./src/middleware/authMiddleware');

const app = express();
const server = http.createServer(app);

connectDB();

// ... (configuración de CORS y Helmet como la tenías)
const allowedOrigins = [
    process.env.ADMIN_FRONTEND_URL,
    process.env.VISUALIZER_FRONTEND_URL,
    // Añade aquí localhost para desarrollo si es necesario y si tus variables de entorno no lo cubren
    // 'http://localhost:5173', // Admin dev
    // 'http://localhost:5174', // Visualizer dev (si es un puerto diferente)
    // 'http://localhost:5175' // Visualizer dev (según ActivatorsPage)
];
if (process.env.NODE_ENV === 'development') {
    if (process.env.VITE_ADMIN_URL_DEV) allowedOrigins.push(process.env.VITE_ADMIN_URL_DEV);
    if (process.env.VITE_VISUALIZER_URL_DEV) allowedOrigins.push(process.env.VITE_VISUALIZER_URL_DEV);
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

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'",
            process.env.ADMIN_FRONTEND_URL,      // ej. https://activate.scanmee.io
            process.env.VISUALIZER_FRONTEND_URL, // ej. https://activate.scanmee.io
            // Añadir URLs de desarrollo si es necesario
            // process.env.VITE_ADMIN_URL_DEV,
            // process.env.VITE_VISUALIZER_URL_DEV,
        ].filter(Boolean), // Filtrar valores undefined/null
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: [
            "'self'", "data:", "blob:",
            `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`
        ].filter(Boolean),
        mediaSrc: [
            "'self'", "data:", "blob:",
            `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`
        ].filter(Boolean),
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: [
            "'self'",
            `wss://${new URL(process.env.ADMIN_FRONTEND_URL || 'http://localhost').hostname}`, // WebSocket prod (asumiendo mismo host que admin)
            `ws://localhost:${process.env.PORT || 3001}`, // WebSocket dev
            process.env.ADMIN_FRONTEND_URL,
            process.env.VISUALIZER_FRONTEND_URL,
            // process.env.VITE_ADMIN_URL_DEV,
            // process.env.VITE_VISUALIZER_URL_DEV,
            "https://api.cloudinary.com"
        ].filter(Boolean),
        frameSrc: ["'self'", process.env.VISUALIZER_FRONTEND_URL].filter(Boolean), // Para iframes, permitir el origen del visualizador
        objectSrc: ["'none'"],
    },
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    },
});

app.set('socketio', io); // Hacer io accesible en controladores

// Lógica para sincronización de PixelMap
const activePixelMapTimers = {}; // { visualizerId: { intervalId: null, colors: [], currentIndex: 0, clients: 0 } }

const startPixelMapTimer = (visualizerId, colors, ioInstance) => {
    if (!colors || colors.length === 0) return;
    if (activePixelMapTimers[visualizerId] && activePixelMapTimers[visualizerId].intervalId) {
        clearInterval(activePixelMapTimers[visualizerId].intervalId); // Limpiar timer existente
    }
    
    console.log(`✨ Iniciando timer de PixelMap para sala: ${visualizerId} con colores:`, colors);
    activePixelMapTimers[visualizerId] = {
        colors: colors,
        currentIndex: 0,
        clients: activePixelMapTimers[visualizerId]?.clients || 0, // Mantener contador de clientes
        intervalId: setInterval(() => {
            const roomData = activePixelMapTimers[visualizerId];
            if (!roomData || roomData.clients === 0) { // Si no hay clientes, parar (aunque leaveRoom debería manejarlo)
                stopPixelMapTimer(visualizerId);
                return;
            }
            roomData.currentIndex = (roomData.currentIndex + 1) % roomData.colors.length;
            const newColor = roomData.colors[roomData.currentIndex];
            // console.log(`🎨 Emitiendo pixelMapColorUpdate a sala ${visualizerId}: ${newColor}`);
            ioInstance.to(visualizerId).emit('pixelMapColorUpdate', { newColor });
        }, 1000) // Cambiar color cada segundo
    };
    // Emitir color inicial
    ioInstance.to(visualizerId).emit('pixelMapColorUpdate', { newColor: colors[0] });
};

const stopPixelMapTimer = (visualizerId) => {
    if (activePixelMapTimers[visualizerId] && activePixelMapTimers[visualizerId].intervalId) {
        clearInterval(activePixelMapTimers[visualizerId].intervalId);
        delete activePixelMapTimers[visualizerId];
        console.log(`🛑 Timer de PixelMap detenido para sala: ${visualizerId}`);
    }
};

app.set('startPixelMapTimer', startPixelMapTimer);
app.set('stopPixelMapTimer', stopPixelMapTimer);


io.on('connection', (socket) => {
    console.log(`🔌 Usuario conectado a WebSocket: ${socket.id}`);

    socket.on('joinVisualizerRoom', (visualizerId) => {
        socket.join(visualizerId);
        console.log(`🚪 Socket ${socket.id} se unió a la sala: ${visualizerId}`);
        if (activePixelMapTimers[visualizerId]) {
            activePixelMapTimers[visualizerId].clients = (activePixelMapTimers[visualizerId].clients || 0) + 1;
            // Enviar el color actual al nuevo cliente que se une
            const currentRoomData = activePixelMapTimers[visualizerId];
            if (currentRoomData.colors && currentRoomData.colors.length > 0) {
                socket.emit('pixelMapColorUpdate', { newColor: currentRoomData.colors[currentRoomData.currentIndex] });
            }
        } else {
            // Si no hay timer pero debería haber uno (ej. contenido es pixelmap), el admin debería reactivarlo
            // O podríamos intentar obtener el contenido actual del activador aquí
        }
    });

    socket.on('leaveVisualizerRoom', (visualizerId) => {
        socket.leave(visualizerId);
        console.log(`🚶 Socket ${socket.id} abandonó la sala: ${visualizerId}`);
        if (activePixelMapTimers[visualizerId]) {
            activePixelMapTimers[visualizerId].clients -= 1;
            if (activePixelMapTimers[visualizerId].clients <= 0) {
                stopPixelMapTimer(visualizerId);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Usuario desconectado de WebSocket: ${socket.id}`);
        // Necesitaríamos saber de qué salas se desconectó para actualizar contadores de clientes
        // Esto es más complejo, por ahora 'leaveVisualizerRoom' es más directo si el cliente lo emite.
        // Una solución más robusta implicaría rastrear sockets por sala.
    });
});


app.get('/api/health', (req, res) => res.status(200).json({ status: 'OK', message: 'Servidor saludable!' }));
app.use('/api/auth', authRoutes);
app.use('/api/media', protect, mediaRoutes);
app.use('/api/activators', protect, activatorRoutes);

app.use((err, req, res, next) => { /* ... (Manejo de errores sin cambios) ... */ 
    console.error("❌ ERROR:", err.message);
    console.error(err.stack); 

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';

    res.status(statusCode).json({
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => { /* ... (Log de inicio sin cambios) ... */ 
    console.log(`🚀 Servidor corriendo en modo ${process.env.NODE_ENV} en el puerto ${PORT}`);
    console.log(`🔗 Admin Frontend esperado en: ${process.env.ADMIN_FRONTEND_URL}`);
    console.log(`🔗 Visualizer Frontend esperado en: ${process.env.VISUALIZER_FRONTEND_URL}`);
    if (process.env.CLOUDINARY_CLOUD_NAME) {
        console.log(`☁️ Cloudinary configurado para: ${process.env.CLOUDINARY_CLOUD_NAME}`);
    } else {
        console.warn("⚠️ Cloudinary no está configurado.");
    }
});

// ... (Manejo de unhandledRejection y uncaughtException sin cambios) ...
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
