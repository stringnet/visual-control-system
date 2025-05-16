// admin-frontend/src/pages/VisualizerDisplayPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import io from 'socket.io-client';
import { 
    Image as ImageIcon, Video as VideoIcon, Globe as WebpageIcon, Palette as PixelMapIcon, 
    WifiOff, Loader2, AlertTriangle, VolumeX, Volume2, PlayCircle 
} from 'lucide-react'; // Palette ya está importado, lo usaremos para el icono

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:3001';

// Subcomponente para el PixelMap
const PixelMapVisualizer = ({ config }) => {
  const { colors, logoUrl, audioUrl } = config;
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userInteractedForAudio, setUserInteractedForAudio] = useState(false);

  useEffect(() => {
    if (!colors || colors.length === 0) return;

    const intervalId = setInterval(() => {
      setCurrentColorIndex((prevIndex) => (prevIndex + 1) % colors.length);
    }, 1000); // Cambiar color cada segundo, por ejemplo

    return () => clearInterval(intervalId);
  }, [colors]);
  
  useEffect(() => {
    // Intentar reproducir audio si hay URL y el usuario ha interactuado
    // O si es la primera carga y no requiere interacción (puede fallar en móviles)
    if (audioUrl && audioRef.current && userInteractedForAudio) {
        audioRef.current.play().catch(e => console.warn("Error al intentar reproducir audio automáticamente:", e));
        setIsPlaying(true);
    } else if (audioRef.current && !userInteractedForAudio && audioUrl) {
        // Para algunos navegadores, el autoplay silenciado puede funcionar y luego permitir desilenciar
        // audioRef.current.muted = true; 
        // audioRef.current.play().catch(e => console.warn("Error al intentar reproducir audio (silenciado):", e));
    }
  }, [audioUrl, userInteractedForAudio]);

  const handleAudioInteraction = () => {
    if (!userInteractedForAudio) {
        setUserInteractedForAudio(true); // Marcar que el usuario interactuó
    }
    if (audioRef.current) {
        if (audioRef.current.paused) {
            audioRef.current.play().catch(e => console.error("Error al reproducir audio:", e));
            setIsPlaying(true);
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    }
  };


  const currentBgColor = colors && colors.length > 0 ? colors[currentColorIndex] : '#000000';

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center transition-colors duration-500 ease-in-out relative"
      style={{ backgroundColor: currentBgColor }}
      onClick={audioUrl ? handleAudioInteraction : undefined} // Permitir clic para iniciar/pausar audio
    >
      {logoUrl && (
        <img 
          src={logoUrl} 
          alt="Logo Pixel Map" 
          className="max-w-[80%] max-h-[60%] object-contain z-10 mb-4 animate-pulse-slow" // Simple animación de pulso
        />
      )}
      {audioUrl && (
        <>
          <audio ref={audioRef} src={audioUrl} loop playsInline />
          {/* Botón de Play/Pause para el audio, más explícito */}
          <button 
            className="absolute bottom-10 bg-black bg-opacity-50 text-white p-3 rounded-full z-20 hover:bg-opacity-75"
            title={isPlaying ? "Pausar música" : "Reproducir música"}
          >
            {isPlaying ? <Volume2 size={28} /> : <PlayCircle size={28} />}
          </button>
        </>
      )}
      {!logoUrl && !audioUrl && (
        <div className="text-center text-white p-4 z-10">
            <Palette size={64} className="mb-4 opacity-70" />
            <p>Visualización de Colores Activa</p>
        </div>
      )}
      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.8; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};


const FullScreenMedia = ({ mediaContent }) => { // Ahora recibe el objeto mediaContent completo
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const { url: mediaUrl, mediaType, pixelMapConfig } = mediaContent || {};

  console.log("FullScreenMedia props:", { mediaUrl, mediaType, pixelMapConfig });

  useEffect(() => {
    if (mediaType === 'video' && videoRef.current) {
      const videoElement = videoRef.current;
      videoElement.load(); 
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setShowPlayButton(false))
                   .catch(error => {
                      console.warn("Video autoplay visual fue prevenido o falló:", error.message);
                      setShowPlayButton(true); setIsMuted(false); 
                   });
      }
    }
    return () => { setShowPlayButton(false); setUserInteracted(false); };
  }, [mediaUrl, mediaType]);

  const handlePlayWithSound = () => { /* ... (sin cambios) ... */ 
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
  const toggleMute = () => { /* ... (sin cambios) ... */ 
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
      setUserInteracted(true);
      setShowPlayButton(false); 
    }
  };

  if (!mediaType) { // Si no hay mediaType (porque mediaContent es null o no tiene mediaType)
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
      {mediaType === 'image' && mediaUrl && ( /* ... (sin cambios) ... */ <img src={mediaUrl} alt="Contenido del visualizador" className="max-w-full max-h-full object-contain" onError={(e) => { console.error("Error al cargar la imagen:", mediaUrl); e.target.alt = "Error al cargar imagen"; }} /> )}
      {mediaType === 'video' && mediaUrl && ( /* ... (sin cambios, solo el botón de volumen) ... */ 
        <>
          <video ref={videoRef} src={mediaUrl} autoPlay loop playsInline muted={isMuted && !userInteracted} className="max-w-full max-h-full object-contain" onClick={toggleMute} onPlay={() => { if(videoRef.current && videoRef.current.muted) setIsMuted(true); else setIsMuted(false); }} onError={(e) => console.error("Error al cargar el video:", mediaUrl, e)}>Tu navegador no soporta la etiqueta de video.</video>
          {showPlayButton && !userInteracted && (<button onClick={handlePlayWithSound} className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20 cursor-pointer" aria-label="Reproducir video con sonido"><PlayCircle size={80} className="text-white opacity-80 hover:opacity-100 transition-opacity" /></button>)}
          {videoRef.current && !showPlayButton && (<button onClick={toggleMute} className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-opacity-80 transition-opacity z-20" title={isMuted ? "Activar sonido" : "Silenciar"}>{isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}</button>)}
        </>
      )}
      {mediaType === 'webpage' && mediaUrl && ( /* ... (sin cambios) ... */ <iframe src={mediaUrl} title="Contenido de Página Web" className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation allow-top-navigation-by-user-activation" allowFullScreen onLoad={() => console.log("Iframe cargado:", mediaUrl)} onError={(e) => console.error("Error al cargar la página web en el iframe:", mediaUrl, e)}>Tu navegador no soporta iframes.</iframe> )}
      
      {mediaType === 'pixelmap' && pixelMapConfig && (
        <PixelMapVisualizer config={pixelMapConfig} />
      )}
    </div>
  );
};


const VisualizerDisplayPage = () => {
  const { visualizerId } = useParams();
  const [mediaContent, setMediaContent] = useState(null); // Ahora almacenará el objeto completo { mediaType, url, pixelMapConfig, etc. }
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchInitialContent = async () => {
      setIsLoading(true); setError('');
      try {
        const response = await api.get(`/activators/content/${visualizerId}`);
        if (response.data && response.data.mediaContent) {
          console.log("Contenido inicial recibido del backend:", response.data.mediaContent);
          setMediaContent(response.data.mediaContent);
        } else {
          console.log("No se recibió mediaContent o está vacío:", response.data);
          setMediaContent(null);
        }
      } catch (err) {
        console.error("Error al obtener contenido inicial:", err.response ? err.response.data : err);
        setError(`No se pudo cargar el contenido para '${visualizerId}'.`);
        setMediaContent(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialContent();

    if (!socketRef.current) {
        socketRef.current = io(SOCKET_URL, { reconnectionAttempts: 5 });
    }
    const socket = socketRef.current;
    socket.on('connect', () => { /* ... (sin cambios) ... */ console.log(`Visualizador conectado a Socket.IO. ID de Socket: ${socket.id}`); setSocketConnected(true); socket.emit('joinVisualizerRoom', visualizerId); });
    socket.on('disconnect', (reason) => { /* ... (sin cambios) ... */ console.warn(`Visualizador desconectado de Socket.IO: ${reason}`); setSocketConnected(false); });
    socket.on('connect_error', (err) => { /* ... (sin cambios) ... */ console.error(`Error de conexión Socket.IO: ${err.message}`); setSocketConnected(false); });
    socket.on('contentUpdate', (data) => {
      if (data.visualizerId === visualizerId) {
        console.log('Actualización de contenido recibida por socket:', data.mediaContent);
        setMediaContent(data.mediaContent); // mediaContent ahora puede ser el objeto con pixelMapConfig
        setError('');
      }
    });
    return () => { /* ... (sin cambios) ... */ console.log('Desmontando VisualizerDisplayPage, desconectando socket...'); if (socketRef.current) { socketRef.current.emit('leaveVisualizerRoom', visualizerId); socketRef.current.disconnect(); socketRef.current = null; } };
  }, [visualizerId]);

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center relative">
      {isLoading && ( /* ... (sin cambios) ... */ <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-10"><Loader2 size={48} className="animate-spin text-blue-400 mb-4" /><p className="text-lg text-slate-300">Cargando: {visualizerId}...</p></div> )}
      {!isLoading && error && !mediaContent && ( /* ... (sin cambios) ... */ <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 z-10 p-8 text-center"><AlertTriangle size={48} className="text-red-500 mb-4" /><p className="text-xl text-red-400 mb-2">Error al Cargar</p><p className="text-sm text-slate-400">{error}</p></div> )}
      
      {/* FullScreenMedia ahora recibe mediaContent completo */}
      {!isLoading && <FullScreenMedia mediaContent={mediaContent} />}

      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-xs text-slate-300 p-2 rounded z-30">
        Visualizador ID: {visualizerId} | Socket: {socketConnected ? <span className="text-green-400">Conectado</span> : <span className="text-red-400">Desconectado</span>}
      </div>
    </div>
  );
};

export default VisualizerDisplayPage;
