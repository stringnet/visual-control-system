// admin-frontend/src/pages/VisualizerDisplayPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import io from 'socket.io-client';
import { Maximize, Image as ImageIcon, Video as VideoIcon, Globe as WebpageIcon, WifiOff, Loader2, AlertTriangle, VolumeX, Volume2, PlayCircle } from 'lucide-react'; // Añadido WebpageIcon

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:3001';

const FullScreenMedia = ({ mediaUrl, mediaType }) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    if (mediaType === 'video' && videoRef.current) {
      const videoElement = videoRef.current;
      videoElement.load(); 

      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setShowPlayButton(false);
        }).catch(error => {
          console.warn("Video autoplay visual fue prevenido o falló:", error.message);
          setShowPlayButton(true);
          setIsMuted(false); 
        });
      }
    }
    return () => {
        setShowPlayButton(false);
        setUserInteracted(false);
    };
  }, [mediaUrl, mediaType]);

  const handlePlayWithSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.play().then(() => {
        setShowPlayButton(false);
        setUserInteracted(true);
      }).catch(error => {
        console.error("Error al intentar reproducir con sonido tras interacción:", error);
      });
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
      setUserInteracted(true);
      setShowPlayButton(false); 
    }
  };

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
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden relative">
      {mediaType === 'image' && (
        <img 
          src={mediaUrl} 
          alt="Contenido del visualizador" 
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            console.error("Error al cargar la imagen:", mediaUrl);
            e.target.alt = "Error al cargar imagen";
          }}
        />
      )}
      {mediaType === 'video' && (
        <>
          <video
            ref={videoRef}
            src={mediaUrl}
            autoPlay
            loop
            playsInline
            muted={isMuted && !userInteracted}
            className="max-w-full max-h-full object-contain"
            onClick={toggleMute}
            onPlay={() => {
                if(videoRef.current && videoRef.current.muted) setIsMuted(true); else setIsMuted(false);
            }}
            onError={(e) => {
              console.error("Error al cargar el video:", mediaUrl, e);
            }}
          >
            Tu navegador no soporta la etiqueta de video.
          </video>
          
          {showPlayButton && !userInteracted && (
            <button
              onClick={handlePlayWithSound}
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20 cursor-pointer"
              aria-label="Reproducir video con sonido"
            >
              <PlayCircle size={80} className="text-white opacity-80 hover:opacity-100 transition-opacity" />
            </button>
          )}

          {videoRef.current && !showPlayButton && ( // Mostrar control de volumen si el video está listo y no hay botón de play grande
            <button
              onClick={toggleMute}
              className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-opacity-80 transition-opacity z-20"
              title={isMuted ? "Activar sonido" : "Silenciar"}
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          )}
        </>
      )}
      {mediaType === 'webpage' && (
        <iframe
          src={mediaUrl}
          title="Contenido de Página Web"
          className="w-full h-full border-0" // Ocupa todo el espacio, sin bordes
          // sandbox="allow-scripts allow-same-origin allow-popups allow-forms" // Opcional: para seguridad, ajusta según necesites
          // allowFullScreen // Opcional
          onError={(e) => {
            console.error("Error al cargar la página web en el iframe:", mediaUrl, e);
            // Podrías mostrar un mensaje de error dentro del iframe o en un overlay
          }}
        >
          Tu navegador no soporta iframes o el contenido no pudo ser cargado.
        </iframe>
      )}
    </div>
  );
};


const VisualizerDisplayPage = () => {
  const { visualizerId } = useParams();
  const [mediaContent, setMediaContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchInitialContent = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get(`/activators/content/${visualizerId}`);
        if (response.data && response.data.mediaContent) {
          setMediaContent(response.data.mediaContent);
        } else {
          setMediaContent(null);
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

    if (!socketRef.current) {
        socketRef.current = io(SOCKET_URL, {
            reconnectionAttempts: 5,
        });
    }
    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log(`Visualizador conectado a Socket.IO. ID de Socket: ${socket.id}`);
      setSocketConnected(true);
      socket.emit('joinVisualizerRoom', visualizerId);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`Visualizador desconectado de Socket.IO: ${reason}`);
      setSocketConnected(false);
    });

    socket.on('connect_error', (err) => {
        console.error(`Error de conexión Socket.IO: ${err.message}`);
        setSocketConnected(false);
        // Ya no establecemos el error general aquí para no interferir con el error de carga de contenido
        // setError(`Error de conexión en tiempo real: ${err.message}. Intentando reconectar...`);
    });
    
    socket.on('contentUpdate', (data) => {
      if (data.visualizerId === visualizerId) {
        console.log('Actualización de contenido recibida:', data.mediaContent);
        setMediaContent(data.mediaContent);
        setError('');
      }
    });

    return () => {
      console.log('Desmontando VisualizerDisplayPage, desconectando socket...');
      if (socketRef.current) {
        socketRef.current.emit('leaveVisualizerRoom', visualizerId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [visualizerId]);

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center relative">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-10">
          <Loader2 size={48} className="animate-spin text-blue-400 mb-4" />
          <p className="text-lg text-slate-300">Cargando visualizador: {visualizerId}...</p>
        </div>
      )}
      {!isLoading && error && !mediaContent && (
         <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 z-10 p-8 text-center">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <p className="text-xl text-red-400 mb-2">Error al Cargar Contenido</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      )}
      
      {!isLoading && <FullScreenMedia mediaUrl={mediaContent?.url} mediaType={mediaContent?.mediaType} />}

      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-xs text-slate-300 p-2 rounded z-30">
        Visualizador ID: {visualizerId} | Socket: {socketConnected ? <span className="text-green-400">Conectado</span> : <span className="text-red-400">Desconectado</span>}
      </div>
    </div>
  );
};

export default VisualizerDisplayPage;
