// admin-frontend/src/pages/VisualizerDisplayPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api'; // Nuestro servicio API
import io from 'socket.io-client'; // Cliente de Socket.IO
import { Maximize, Image as ImageIcon, Video as VideoIcon, WifiOff, Loader2, AlertTriangle } from 'lucide-react';

// La URL base de tu servidor de Socket.IO.
// Vite reemplazará import.meta.env.VITE_SOCKET_URL con el valor que configures
// en las variables de entorno de build en Easypanel (o en un .env local para desarrollo).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:3001'; // Fallback para desarrollo

const FullScreenMedia = ({ mediaUrl, mediaType }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    // Intentar reproducir video automáticamente cuando cambie la URL
    if (mediaType === 'video' && videoRef.current) {
      videoRef.current.load(); // Recargar si la fuente cambia
      videoRef.current.play().catch(error => {
        console.warn("Video autoplay fue prevenido por el navegador:", error.message);
        // Los navegadores a menudo requieren interacción del usuario o que el video esté silenciado.
      });
    }
  }, [mediaUrl, mediaType]);

  if (!mediaUrl || !mediaType) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-slate-400 p-8">
        <ImageIcon size={64} className="mb-4 opacity-50" />
        <p className="text-xl">Esperando contenido...</p>
        <p className="text-sm mt-2">El activador no tiene multimedia asignada o está inactivo.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {mediaType === 'image' && (
        <img 
          src={mediaUrl} 
          alt="Contenido del visualizador" 
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            console.error("Error al cargar la imagen:", mediaUrl);
            e.target.alt = "Error al cargar imagen";
            // Podrías mostrar una imagen placeholder aquí
          }}
        />
      )}
      {mediaType === 'video' && (
        <video
          ref={videoRef}
          src={mediaUrl}
          autoPlay
          loop
          muted // Importante para autoplay en muchos navegadores
          playsInline // Necesario para iOS
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            console.error("Error al cargar el video:", mediaUrl, e);
            // Podrías mostrar un mensaje de error de video aquí
          }}
        >
          Tu navegador no soporta la etiqueta de video.
        </video>
      )}
    </div>
  );
};


const VisualizerDisplayPage = () => {
  const { visualizerId } = useParams(); // Obtiene el :visualizerId de la URL
  const navigate = useNavigate(); // Para redirección si es necesario (ej. login)
  
  const [mediaContent, setMediaContent] = useState(null); // { url, mediaType }
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // No se requiere autenticación de admin para ver un visualizador público,
    // pero el backend sí protegerá la ruta /api/activators/content/:visualizerId
    // si así lo configuramos (actualmente está protegida por `isViewer` que incluye `isAdmin`).
    // Si los visualizadores requieren un login de "viewer", esa lógica iría aquí.

    const fetchInitialContent = async () => {
      setIsLoading(true);
      setError('');
      try {
        // El backend debe tener una ruta pública o protegida por un token de "viewer"
        // para obtener el contenido inicial del visualizador.
        // Asumimos que /api/activators/content/:visualizerId es accesible.
        // Si requiere un token de "viewer", habría que manejar ese login primero.
        const response = await api.get(`/activators/content/${visualizerId}`);
        if (response.data && response.data.mediaContent) {
          setMediaContent(response.data.mediaContent);
        } else {
          setMediaContent(null); // No hay contenido o activador inactivo
        }
      } catch (err) {
        console.error("Error al obtener contenido inicial del visualizador:", err.response ? err.response.data : err);
        setError(`No se pudo cargar el contenido para '${visualizerId}'. Verifica que el ID sea correcto y el activador esté configurado.`);
        setMediaContent(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialContent();

    // Configurar Socket.IO
    // Usamos una ref para el socket para evitar reconexiones en cada render si SOCKET_URL no cambia.
    if (!socketRef.current) {
        socketRef.current = io(SOCKET_URL, {
            reconnectionAttempts: 5, // Intentar reconectar 5 veces
            // Podrías añadir query params si necesitas pasar info al conectar, ej. el visualizerId
            // query: { visualizerId } 
        });
    }
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log(`Visualizador conectado a Socket.IO. ID de Socket: ${socket.id}`);
      setSocketConnected(true);
      // Unirse a una sala específica para este visualizerId
      socket.emit('joinVisualizerRoom', visualizerId);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`Visualizador desconectado de Socket.IO: ${reason}`);
      setSocketConnected(false);
    });

    socket.on('connect_error', (err) => {
        console.error(`Error de conexión Socket.IO: ${err.message}`);
        setSocketConnected(false);
        setError(`Error de conexión en tiempo real: ${err.message}. Intentando reconectar...`);
    });
    
    // Escuchar actualizaciones de contenido para este visualizador específico
    socket.on('contentUpdate', (data) => {
      if (data.visualizerId === visualizerId) {
        console.log('Actualización de contenido recibida:', data.mediaContent);
        setMediaContent(data.mediaContent); // mediaContent puede ser null
        setError(''); // Limpiar errores si llega una actualización
      }
    });

    // Limpieza al desmontar el componente
    return () => {
      console.log('Desmontando VisualizerDisplayPage, desconectando socket...');
      if (socketRef.current) {
        socketRef.current.emit('leaveVisualizerRoom', visualizerId);
        socketRef.current.disconnect();
        socketRef.current = null; // Limpiar la referencia
      }
    };
  }, [visualizerId]); // Dependencia: visualizerId

  // Pantalla completa al montar (opcional)
  // const requestFullScreen = () => {
  //   const elem = document.documentElement;
  //   if (elem.requestFullscreen) {
  //     elem.requestFullscreen().catch(err => console.warn(err.message));
  //   } else if (elem.webkitRequestFullscreen) { /* Safari */
  //     elem.webkitRequestFullscreen().catch(err => console.warn(err.message));
  //   }
  // };
  // useEffect(() => {
  //   // requestFullScreen(); // Podrías llamarlo aquí o con un botón
  // }, []);

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center relative">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-10">
          <Loader2 size={48} className="animate-spin text-blue-400 mb-4" />
          <p className="text-lg text-slate-300">Cargando visualizador: {visualizerId}...</p>
        </div>
      )}
      {!isLoading && error && (
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 z-10 p-8 text-center">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <p className="text-xl text-red-400 mb-2">Error al Cargar Contenido</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      )}
      
      {/* Componente para mostrar la media */}
      {!isLoading && <FullScreenMedia mediaUrl={mediaContent?.url} mediaType={mediaContent?.mediaType} />}

      {/* Overlay con información (opcional, para depuración o info) */}
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-xs text-slate-300 p-2 rounded">
        Visualizador ID: {visualizerId} | Socket: {socketConnected ? <span className="text-green-400">Conectado</span> : <span className="text-red-400">Desconectado</span>}
      </div>
      {/* Botón para pantalla completa (si no es automático) */}
      {/* <button 
        onClick={requestFullScreen} 
        className="absolute top-2 right-2 bg-slate-700 bg-opacity-50 hover:bg-opacity-75 p-2 rounded-full"
        title="Pantalla Completa"
      >
        <Maximize size={20} />
      </button> */}
    </div>
  );
};

export default VisualizerDisplayPage;
