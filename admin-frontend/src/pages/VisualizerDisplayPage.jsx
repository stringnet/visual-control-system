// admin-frontend/src/pages/VisualizerDisplayPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import io from 'socket.io-client';
import { 
    Image as ImageIcon, Video as VideoIcon, Globe as WebpageIcon, Palette, 
    WifiOff, Loader2, AlertTriangle, VolumeX, Volume2, PlayCircle 
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:3001';

// Subcomponente para el PixelMap
const PixelMapVisualizer = ({ config }) => {
  // Proporcionar valores por defecto para config y sus propiedades internas
  const { 
    colors = ['#111827', '#374151', '#4B5563'], // Colores por defecto si no se proporcionan
    logoUrl = '', 
    audioUrl = '' 
  } = config || {}; // Si config es null o undefined, usar un objeto vacío

  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [userInteractedForAudio, setUserInteractedForAudio] = useState(false);

  useEffect(() => {
    if (!colors || colors.length === 0) {
        setCurrentColorIndex(0); 
        return;
    }

    const intervalId = setInterval(() => {
      setCurrentColorIndex((prevIndex) => (prevIndex + 1) % colors.length);
    }, 1000); // Cambiar color cada segundo

    return () => clearInterval(intervalId);
  }, [colors]);
  
  useEffect(() => {
    if (audioUrl && audioRef.current && userInteractedForAudio) {
        audioRef.current.play().catch(e => console.warn("Error al intentar reproducir audio automáticamente:", e.message));
        setIsPlaying(true);
    } else if (audioRef.current && !userInteractedForAudio && audioUrl && audioRef.current.paused) {
        // No intentar autoplay agresivo aquí para evitar errores de consola persistentes
        // El usuario deberá interactuar.
    }
  }, [audioUrl, userInteractedForAudio]);

  const handleAudioInteraction = () => {
    if (!audioUrl || !audioRef.current) return;

    if (!userInteractedForAudio) {
        setUserInteractedForAudio(true); 
    }

    if (audioRef.current.paused) {
        audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(e => console.error("Error al reproducir audio tras interacción:", e.message));
    } else {
        audioRef.current.pause();
        setIsPlaying(false);
    }
  };

  const currentBgColor = colors && colors.length > 0 ? colors[currentColorIndex] : '#111827';

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center transition-colors duration-500 ease-in-out relative"
      style={{ backgroundColor: currentBgColor }}
      onClick={handleAudioInteraction} // Permitir clic en todo el fondo para audio
    >
      {logoUrl && (
        <img 
          src={logoUrl} 
          alt="Logo Pixel Map" 
          className="max-w-[70%] max-h-[50%] object-contain z-10 mb-4 animate-pulse-slow"
        />
      )}
      {audioUrl && (
        <>
          <audio ref={audioRef} src={audioUrl} loop playsInline />
          {/* El botón ahora es más un indicador, el clic en el fondo controla */}
          <div
            className="absolute bottom-10 bg-black bg-opacity-50 text-white p-3 rounded-full z-20 cursor-pointer"
            title={isPlaying ? "Pausar música" : "Reproducir música"}
          >
            {isPlaying ? <Volume2 size={28} /> : <PlayCircle size={28} />}
          </div>
        </>
      )}
      {!logoUrl && !audioUrl && colors && colors.length > 0 && (
        <div className="text-center text-white p-4 z-10">
            <Palette size={64} className="mb-4 opacity-70" />
            <p>Visualización de Colores Activa</p>
        </div>
      )}
    </div>
  );
};


const FullScreenMedia = ({ mediaContent }) => { 
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  // Desestructurar con valores por defecto para evitar errores si mediaContent es null/undefined
  const { url: mediaUrl, mediaType, pixelMapConfig, originalName } = mediaContent || {};

  // console.log("FullScreenMedia props:", { mediaUrl, mediaType, pixelMapConfig, originalName });

  useEffect(() => {
    if (mediaType === 'video' && videoRef.current && mediaUrl) { // Asegurarse que mediaUrl exista
      const videoElement = videoRef.current;
      videoElement.src = mediaUrl; // Asignar src aquí para forzar recarga si cambia
      videoElement.load(); 
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setShowPlayButton(false))
                   .catch(error => {
                      console.warn(`Video autoplay para "${originalName || 'video'}" prevenido:`, error.message);
                      setShowPlayButton(true); setIsMuted(false); 
                   });
      }
    }
    // Resetear estados cuando el contenido cambia para evitar comportamientos extraños
    return () => { 
        setShowPlayButton(false); 
        setUserInteracted(false);
        // No resetear isMuted aquí para mantener la preferencia del usuario si es posible
    };
  }, [mediaUrl, mediaType, originalName]);

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
      if (videoRef.current.paused && !videoRef.current.muted) { // Si estaba pausado y se desilencia, intentar play
        videoRef.current.play().catch(e => console.warn("Play falló al desilenciar", e.message));
      }
      setShowPlayButton(false); 
    }
  };

  if (!mediaType) { 
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
      {mediaType === 'image' && mediaUrl && ( <img src={mediaUrl} alt={originalName || "Contenido visualizador"} className="max-w-full max-h-full object-contain" onError={(e) => { console.error("Error al cargar la imagen:", mediaUrl); e.target.alt = "Error al cargar imagen"; }} /> )}
      {mediaType === 'video' && mediaUrl && ( 
        <>
          <video ref={videoRef} /* src se asigna en useEffect */ autoPlay loop playsInline muted={isMuted && !userInteracted} className="max-w-full max-h-full object-contain" onClick={toggleMute} onPlay={() => { if(videoRef.current && videoRef.current.muted) setIsMuted(true); else setIsMuted(false); }} onError={(e) => console.error("Error al cargar el video:", mediaUrl, e)}>Tu navegador no soporta la etiqueta de video.</video>
          {showPlayButton && !userInteracted && (<button onClick={handlePlayWithSound} className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20 cursor-pointer" aria-label="Reproducir video con sonido"><PlayCircle size={80} className="text-white opacity-80 hover:opacity-100 transition-opacity" /></button>)}
          {videoRef.current && !showPlayButton && (<button onClick={toggleMute} className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white p-3 rounded-full hover:bg-opacity-80 transition-opacity z-20" title={isMuted ? "Activar sonido" : "Silenciar"}>{isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}</button>)}
        </>
      )}
      {mediaType === 'webpage' && mediaUrl && ( <iframe src={mediaUrl} title={originalName || "Contenido Web"} className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-top-navigation allow-top-navigation-by-user-activation" allowFullScreen onLoad={() => console.log("Iframe cargado:", mediaUrl)} onError={(e) => console.error("Error al cargar la página web en el iframe:", mediaUrl, e)}>Tu navegador no soporta iframes.</iframe> )}
      
      {mediaType === 'pixelmap' && pixelMapConfig && (
        <PixelMapVisualizer config={pixelMapConfig} />
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
      setIsLoading(true); setError('');
      try {
        const response = await api.get(`/activators/content/${visualizerId}`);
        if (response.data && response.data.mediaContent) {
          // console.log("Contenido inicial recibido del backend:", response.data.mediaContent);
          setMediaContent(response.data.mediaContent);
        } else {
          // console.log("No se recibió mediaContent o está vacío:", response.data);
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
    socket.on('connect', () => { console.log(`Visualizador conectado a Socket.IO. ID de Socket: ${socket.id}`); setSocketConnected(true); socket.emit('joinVisualizerRoom', visualizerId); });
    socket.on('disconnect', (reason) => { console.warn(`Visualizador desconectado de Socket.IO: ${reason}`); setSocketConnected(false); });
    socket.on('connect_error', (err) => { console.error(`Error de conexión Socket.IO: ${err.message}`); setSocketConnected(false); });
    socket.on('contentUpdate', (data) => {
      if (data.visualizerId === visualizerId) {
        // console.log('Actualización de contenido recibida por socket:', data.mediaContent);
        setMediaContent(data.mediaContent); 
        setError('');
      }
    });
    return () => { console.log('Desmontando VisualizerDisplayPage, desconectando socket...'); if (socketRef.current) { socketRef.current.emit('leaveVisualizerRoom', visualizerId); socketRef.current.disconnect(); socketRef.current = null; } };
  }, [visualizerId]);

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center relative">
      {isLoading && ( <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 z-10"><Loader2 size={48} className="animate-spin text-blue-400 mb-4" /><p className="text-lg text-slate-300">Cargando: {visualizerId}...</p></div> )}
      {!isLoading && error && !mediaContent && ( <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 z-10 p-8 text-center"><AlertTriangle size={48} className="text-red-500 mb-4" /><p className="text-xl text-red-400 mb-2">Error al Cargar</p><p className="text-sm text-slate-400">{error}</p></div> )}
      
      {!isLoading && <FullScreenMedia mediaContent={mediaContent} />}

      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-xs text-slate-300 p-2 rounded z-30">
        Visualizador ID: {visualizerId} | Socket: {socketConnected ? <span className="text-green-400">Conectado</span> : <span className="text-red-400">Desconectado</span>}
      </div>
    </div>
  );
};

export default VisualizerDisplayPage;
