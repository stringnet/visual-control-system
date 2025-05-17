<template>
  <div class="pixel-art-realtime-container">
    <div 
      class="visualizer-area" 
      :style="visualizerAreaStyle" 
      @click="handleUserInteraction" 
      title="Haz clic para activar audio si es necesario"
    >
      <div
        v-for="(pixel, index) in pixels"
        :key="pixel.id || `pixel-${index}`"
        :ref="el => setPixelRef(el, index)"
        class="pixel-element"
        :style="getPixelRuntimeStyle(pixel)"
      >
        </div>

      <img 
        v-if="logoUrl" 
        :src="logoUrl" 
        alt="Logo" 
        class="pixel-art-logo" 
        ref="logoRef"
        :style="logoStyle"
      />
    </div>

    <div class="audio-status-controls" v-if="audioUrlFromData">
      <p class="status-message">{{ musicStatusMessage }}</p>
      <audio 
        id="audioPlayerForSync" 
        ref="audioPlayerElementRef" 
        controls 
        class="audio-player"
      ></audio>
    </div>
    <div v-else class="audio-status-controls">
      <p class="status-message">No hay audio asociado a este Pixel Map.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
// import { useRoute } from 'vue-router'; // Descomenta si usas Vue Router para obtener el activatorId
import io from 'socket.io-client'; // Importar socket.io-client

// --- Variables Reactivas del Componente ---
const pixelArtData = ref(null); 
const pixels = ref([]);         
const logoUrl = ref('');        
const audioUrlFromData = ref(''); 
const pixelArtName = ref('');   

const pixelRefs = ref([]);        
const logoRef = ref(null);        
const audioPlayerElementRef = ref(null); 

const musicStatusMessage = ref('Esperando datos del Pixel Map...');

// --- Configuración de Web Audio API y Detección de Beats ---
let audioContext = null;
let analyserNode = null;
let mediaElementSourceNode = null;
let frequencyDataArray = null;
let animationFrameId = null;

const BEAT_THRESHOLD_INITIAL = 150; 
let currentBeatThreshold = BEAT_THRESHOLD_INITIAL;
const BEAT_COOLDOWN_MS = 180;       
let lastBeatTimestamp = 0;
const BASS_FREQ_START_BIN = 0;    
const BASS_FREQ_END_BIN = 5;      

const beatEffectColorPalette = [ 
    '#FF5733', '#FFBD33', '#75FF33', '#33FFBD', 
    '#3375FF', '#BD33FF', '#FF3375', '#FFFFFF' 
];
let lastUsedBeatColorIndex = -1;

// --- Variable para el Socket ---
let socket = null;

// --- Lógica del Componente ---

// 1. PROCESAMIENTO DE DATOS DEL PIXEL ART RECIBIDOS DEL BACKEND
function processPixelArtData(receivedContent) {
  console.log("[DBUG] processPixelArtData - Datos recibidos:", receivedContent); 
  if (!receivedContent || receivedContent.mediaType !== 'pixelmap' || !receivedContent.pixelMapConfig) {
    musicStatusMessage.value = "Datos del Pixel Map inválidos o no recibidos.";
    console.error("[DBUG] processPixelArtData - Datos del Pixel Map inválidos:", receivedContent); 
    pixels.value = []; 
    logoUrl.value = '';
    audioUrlFromData.value = '';
    return;
  }

  const config = receivedContent.pixelMapConfig;
  
  musicStatusMessage.value = `Configurando: ${receivedContent.originalName || 'Pixel Map'}`;
  console.log(`[DBUG] processPixelArtData - Configurando para: ${receivedContent.originalName || 'Pixel Map'}`); 
  
  pixelArtData.value = receivedContent; 
  pixelArtName.value = receivedContent.originalName || 'Pixel Map sin nombre';
  logoUrl.value = config.logoUrl || '';
  audioUrlFromData.value = config.audioUrl || '';

  const numGridRows = 10; 
  const numGridCols = 10; 
  const totalPixelsInGrid = numGridRows * numGridCols;
  const newPixelsArray = [];

  if (config.colors && config.colors.length > 0) {
    console.log("[DBUG] processPixelArtData - Usando colores del backend:", config.colors); 
    for (let i = 0; i < totalPixelsInGrid; i++) {
      const colorFromBackend = config.colors[i % config.colors.length];
      newPixelsArray.push({
        id: `px${i}`,
        originalColor: colorFromBackend,
        x: (i % numGridCols) * (100 / numGridCols), 
        y: Math.floor(i / numGridCols) * (100 / numGridRows), 
        width: (100 / numGridCols), 
        height: (100 / numGridRows), 
        currentStyle: { backgroundColor: colorFromBackend } 
      });
    }
  } else {
    console.warn("[DBUG] processPixelArtData - No se proporcionaron colores en pixelMapConfig. Creando píxeles con color por defecto."); 
    for (let i = 0; i < totalPixelsInGrid; i++) {
      const defaultColor = '#333333';
      newPixelsArray.push({
        id: `px${i}`,
        originalColor: defaultColor,
        x: (i % numGridCols) * (100 / numGridCols),
        y: Math.floor(i / numGridCols) * (100 / numGridRows),
        width: (100 / numGridCols),
        height: (100 / numGridRows),
        currentStyle: { backgroundColor: defaultColor }
      });
    }
  }
  pixels.value = newPixelsArray;
  console.log("[DBUG] processPixelArtData - Píxeles procesados:", pixels.value.length); 

  if (audioUrlFromData.value) {
    console.log("[DBUG] processPixelArtData - URL de audio encontrada, inicializando sincronización:", audioUrlFromData.value); 
    nextTick().then(() => { 
      initializeAudioSynchronization();
    });
  } else {
    musicStatusMessage.value = "No hay audio configurado para este Pixel Map.";
    console.warn("[DBUG] processPixelArtData - No hay audioUrlFromData para este Pixel Map."); 
  }
}

// 2. Funciones para Estilos Dinámicos
const visualizerAreaStyle = computed(() => ({
  width: '80vw', 
  height: '70vh', 
  maxWidth: '800px',
  maxHeight: '600px',
  position: 'relative',
  backgroundColor: '#111', 
  border: '1px solid #333',
  borderRadius: '8px',
  overflow: 'hidden', 
  cursor: (audioContext && audioContext.state === 'suspended') ? 'pointer' : 'default',
}));

const getPixelRuntimeStyle = (pixel) => {
  return {
    position: 'absolute',
    left: `${pixel.x}%`,
    top: `${pixel.y}%`,
    width: `${pixel.width}%`,
    height: `${pixel.height}%`,
    transition: 'background-color 0.05s ease-out, transform 0.1s ease-out, filter 0.1s ease-out',
    ...pixel.currentStyle, 
  };
};

const logoStyle = computed(() => ({
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: '20%', 
    maxHeight: '20%',
    objectFit: 'contain',
    zIndex: 10, 
    transition: 'transform 0.1s ease-out, filter 0.1s ease-out', 
}));

const setPixelRef = (el, index) => {
  if (el) {
    pixelRefs.value[index] = el;
  }
};

// 3. Lógica de Sincronización de Audio
function initializeAudioSynchronization() {
  console.log("[DBUG] initializeAudioSynchronization - Iniciando..."); 
  if (!audioUrlFromData.value || !audioPlayerElementRef.value) {
    musicStatusMessage.value = "Falta URL de audio o reproductor no está listo.";
    console.error("[DBUG] initializeAudioSynchronization - Falta URL de audio o reproductor no está listo."); 
    return;
  }

  if (!audioContext) { 
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256; 
      const bufferLength = analyserNode.frequencyBinCount; 
      frequencyDataArray = new Uint8Array(bufferLength); 
      console.log("[DBUG] initializeAudioSynchronization - AudioContext y Analyser creados."); 
    } catch (e) {
      console.error("[DBUG] initializeAudioSynchronization - Error inicializando Web Audio API:", e); 
      musicStatusMessage.value = "Error: Web Audio API no disponible o bloqueada.";
      return;
    }
  }

  audioPlayerElementRef.value.src = audioUrlFromData.value;
  audioPlayerElementRef.value.crossOrigin = "anonymous"; 
  console.log("[DBUG] initializeAudioSynchronization - src del audioPlayer seteado:", audioUrlFromData.value); 

  const setupAndPlay = () => {
    console.log("[DBUG] initializeAudioSynchronization - setupAndPlay - Estado del AudioContext:", audioContext.state); 
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(actuallySetupAndPlay).catch(e => {
        musicStatusMessage.value = "Haz clic en el visualizador para activar audio.";
        console.warn("[DBUG] initializeAudioSynchronization - Reanudar AudioContext falló, esperando interacción del usuario.", e); 
      });
    } else {
      actuallySetupAndPlay();
    }
  };

  const actuallySetupAndPlay = () => {
    console.log("[DBUG] initializeAudioSynchronization - actuallySetupAndPlay - Iniciando configuración de nodos."); 
    if (mediaElementSourceNode) { 
      mediaElementSourceNode.disconnect();
    }
    try {
      mediaElementSourceNode = audioContext.createMediaElementSource(audioPlayerElementRef.value);
      mediaElementSourceNode.connect(analyserNode);
      analyserNode.connect(audioContext.destination); 
      console.log("[DBUG] initializeAudioSynchronization - Nodos de audio conectados."); 

      audioPlayerElementRef.value.play().then(() => {
        musicStatusMessage.value = "¡Sincronizando con la música!";
        console.log("[DBUG] initializeAudioSynchronization - Reproducción de audio iniciada."); 
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        renderMusicVisualizationFrame();
      }).catch(e => {
        console.error("[DBUG] initializeAudioSynchronization - Error al reproducir audio:", e); 
        musicStatusMessage.value = "Error al reproducir. Verifica la URL/formato del audio.";
      });
    } catch (error) {
      console.error("[DBUG] initializeAudioSynchronization - Error configurando fuente de audio:", error); 
      musicStatusMessage.value = "Error al iniciar análisis de audio.";
    }
  };
  
  const attemptToPlayAudio = () => {
     console.log("[DBUG] initializeAudioSynchronization - attemptToPlayAudio - Estado del AudioContext:", audioContext ? audioContext.state : "null", "Player readyState:", audioPlayerElementRef.value ? audioPlayerElementRef.value.readyState : "null"); 
     if (audioContext && audioPlayerElementRef.value && audioPlayerElementRef.value.src) { 
        if (audioContext.state === 'running') {
            if (audioPlayerElementRef.value.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) { 
                setupAndPlay();
            } else {
                console.log("[DBUG] initializeAudioSynchronization - Audio no listo (readyState < HAVE_ENOUGH_DATA), esperando 'canplaythrough'."); 
                audioPlayerElementRef.value.addEventListener('canplaythrough', setupAndPlay, { once: true });
            }
        } else { 
            musicStatusMessage.value = "Audio pausado. Haz clic en el visualizador para iniciar.";
            console.log("[DBUG] initializeAudioSynchronization - AudioContext no está 'running', esperando interacción."); 
        }
     } else {
        console.warn("[DBUG] initializeAudioSynchronization - attemptToPlayAudio - Condiciones no cumplidas (audioContext, player o src faltantes)."); 
     }
  };
  
  audioPlayerElementRef.value.addEventListener('error', (e) => {
    console.error("[DBUG] initializeAudioSynchronization - Error en elemento <audio>:", e); 
    musicStatusMessage.value = "Error cargando archivo de audio. Verifica la URL y CORS.";
  });
  
   if (audioPlayerElementRef.value.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) { 
        attemptToPlayAudio();
    } else {
        console.log("[DBUG] initializeAudioSynchronization - Audio no listo inicialmente, esperando 'canplaythrough'."); 
        audioPlayerElementRef.value.addEventListener('canplaythrough', attemptToPlayAudio, { once: true });
    }
}

function handleUserInteraction() {
  console.log("[DBUG] handleUserInteraction - Interacción detectada."); 
  if (audioContext && audioContext.state === 'suspended') {
    console.log("[DBUG] handleUserInteraction - AudioContext suspendido, intentando reanudar."); 
    audioContext.resume().then(() => {
      musicStatusMessage.value = "Audio activado.";
      console.log("[DBUG] handleUserInteraction - AudioContext reanudado."); 
      if (audioPlayerElementRef.value && audioPlayerElementRef.value.paused && audioPlayerElementRef.value.src) {
         initializeAudioSynchronization(); 
      }
    }).catch(e => console.error("[DBUG] handleUserInteraction - Error reanudando AudioContext tras interacción:", e)); 
  } else if (audioContext && audioPlayerElementRef.value && audioPlayerElementRef.value.paused && audioPlayerElementRef.value.src) {
    console.log("[DBUG] handleUserInteraction - AudioContext corriendo, audio pausado. Intentando reproducir."); 
    audioPlayerElementRef.value.play().catch(e => console.error("[DBUG] handleUserInteraction - Error al reproducir tras interacción:", e)); 
  }
}


function renderMusicVisualizationFrame() {
  animationFrameId = requestAnimationFrame(renderMusicVisualizationFrame);

  if (!analyserNode || !frequencyDataArray || !audioContext || audioContext.state !== 'running') {
    return; 
  }

  analyserNode.getByteFrequencyData(frequencyDataArray); 

  let bassEnergy = 0;
  const endBin = Math.min(BASS_FREQ_END_BIN, frequencyDataArray.length - 1);
  const startBin = Math.min(BASS_FREQ_START_BIN, endBin);

  if (frequencyDataArray.length > 0 && endBin >= startBin) {
    for (let i = startBin; i <= endBin; i++) {
      bassEnergy += frequencyDataArray[i];
    }
    bassEnergy /= (endBin - startBin + 1); 
  }

  const currentTime = Date.now();
  if (bassEnergy > currentBeatThreshold && (currentTime - lastBeatTimestamp) > BEAT_COOLDOWN_MS) {
    lastBeatTimestamp = currentTime;
    // console.log(`[DBUG] Beat detectado! Energía: ${bassEnergy.toFixed(2)}`); 


    let beatColorIndex; 
    do {
      beatColorIndex = Math.floor(Math.random() * beatEffectColorPalette.length);
    } while (beatColorIndex === lastUsedBeatColorIndex && beatEffectColorPalette.length > 1);
    const chosenBeatColor = beatEffectColorPalette[beatColorIndex];
    lastUsedBeatColorIndex = beatColorIndex;

    actualizarVisualesConBeat({
      energia: bassEnergy,
      colorSugerido: chosenBeatColor, 
      timestamp: currentTime
    });

    currentBeatThreshold = Math.max(BEAT_THRESHOLD_INITIAL * 0.7, bassEnergy * 0.85);
  } else if (bassEnergy < currentBeatThreshold * 0.9 && currentBeatThreshold > BEAT_THRESHOLD_INITIAL * 0.7) {
    currentBeatThreshold *= 0.995; 
  }
}

// 4. FUNCIÓN CLAVE: Actualizar Visuales (Píxeles y Logo) con el Beat
function actualizarVisualesConBeat(datosDelBeat) {
  const beatIntensity = Math.min(1, datosDelBeat.energia / 220); 

  pixels.value.forEach((pixelData) => { 
    if (pixelData) {
      const originalPixelColor = pixelData.originalColor;
      pixelData.currentStyle = {
        ...pixelData.currentStyle, 
        backgroundColor: datosDelBeat.colorSugerido, 
        transform: `scale(${1 + beatIntensity * 0.1})`, 
        filter: `brightness(${1 + beatIntensity * 0.4})` 
      };

      setTimeout(() => {
        pixelData.currentStyle = {
          backgroundColor: originalPixelColor,
          transform: 'scale(1)',
          filter: 'brightness(1)'
        };
      }, BEAT_COOLDOWN_MS * 0.7); 
    }
  });

  if (logoRef.value) {
    const logoElement = logoRef.value;
    logoElement.style.transform = `translate(-50%, -50%) scale(${1 + beatIntensity * 0.05})`; 
    logoElement.style.filter = `drop-shadow(0 0 ${Math.round(beatIntensity * 10)}px ${datosDelBeat.colorSugerido}) brightness(${1 + beatIntensity * 0.2})`;

    setTimeout(() => {
      logoElement.style.transform = 'translate(-50%, -50%) scale(1)';
      logoElement.style.filter = 'drop-shadow(0 0 0px transparent) brightness(1)';
    }, BEAT_COOLDOWN_MS * 0.7);
  }
}

// --- Ciclo de Vida del Componente y Observadores ---
onMounted(() => {
  console.log("[DBUG] onMounted - Componente montado."); 
  pixelRefs.value = []; 
  
  const activatorIdFromPath = window.location.pathname.split('/').pop() || 'default'; 
  console.log("[DBUG] onMounted - activatorIdFromPath determinado:", activatorIdFromPath); 
  
  const SOCKET_SERVER_URL = 'wss://activate.scanmee.io'; 
  console.log("[DBUG] onMounted - URL del servidor WebSocket:", SOCKET_SERVER_URL); 
  
  if (socket && socket.connected) {
      console.log("[DBUG] onMounted - Socket ya conectado. Posiblemente HMR o remontaje rápido."); 
  } else {
      socket = io(SOCKET_SERVER_URL, {});
      console.log("[DBUG] onMounted - Nueva instancia de socket creada."); 
  }

  console.log("[DBUG] onMounted - Registrando listeners de socket..."); 
  socket.on('connect', () => {
    try { // NUEVO TRY-CATCH
      console.log(`[DBUG] Socket conectado con ID: ${socket.id}`); 
      musicStatusMessage.value = `Conectado. Esperando datos para sala: ${activatorIdFromPath}`;
      
      if (activatorIdFromPath && activatorIdFromPath !== 'default') {
        socket.emit('joinRoom', activatorIdFromPath); 
        console.log(`[DBUG] Emitiendo 'joinRoom' para la sala: ${activatorIdFromPath}`); 
      } else {
        console.warn("[DBUG] 'joinRoom' no emitido: activatorIdFromPath es inválido o 'default'. Valor:", activatorIdFromPath);
      }
    } catch (error) {
      console.error("[DBUG] Error dentro del callback socket.on('connect'):", error);
    }
  });

  socket.on('disconnect', (reason) => {
    console.warn(`[DBUG] Socket desconectado: ${reason}`); 
    musicStatusMessage.value = "Desconectado del servidor de actualizaciones.";
  });

  socket.on('connect_error', (error) => {
    console.error('[DBUG] Error de conexión WebSocket:', error); 
    musicStatusMessage.value = "Error al conectar con el servidor de actualizaciones.";
  });

  socket.on('contentUpdate', (data) => {
    console.log("[DBUG] Evento 'contentUpdate' recibido del servidor:", data); 
    processPixelArtData(data);
  });
  console.log("[DBUG] onMounted - Listeners de socket registrados."); 
});

onUnmounted(() => {
  console.log("[DBUG] onUnmounted - Desmontando componente..."); 
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (mediaElementSourceNode) {
    mediaElementSourceNode.disconnect();
  }
  if (analyserNode) {
    analyserNode.disconnect();
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close().catch(e => console.error("[DBUG] onUnmounted - Error cerrando AudioContext:", e)); 
    audioContext = null; 
  }
  if (socket) {
    console.log("[DBUG] onUnmounted - Desconectando socket..."); 
    socket.disconnect();
    socket = null; 
  }
});

watch(audioUrlFromData, (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl && audioPlayerElementRef.value) {
    console.log("[DBUG] watch audioUrlFromData - Nueva URL de audio detectada, reiniciando sincronización:", newUrl); 
    if (audioPlayerElementRef.value) audioPlayerElementRef.value.pause();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (mediaElementSourceNode) mediaElementSourceNode.disconnect();
    
    nextTick().then(() => {
        initializeAudioSynchronization();
    });
  }
});

</script>

<style scoped>
.pixel-art-realtime-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh; 
  background-color: #0a0a1e; 
  padding: 20px;
  box-sizing: border-box;
}

.visualizer-area {
  display: flex; 
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.pixel-element {
  /* Estilos base definidos en computed property: getPixelRuntimeStyle */
}

.pixel-art-logo {
  /* Estilos base definidos en computed property: logoStyle */
}

.audio-status-controls {
  padding: 10px 15px;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  color: #e0e0e0;
  text-align: center;
  min-width: 300px;
  max-width: 90%;
}

.status-message {
  margin: 0 0 10px 0;
  font-size: 0.9em;
  min-height: 1.2em; 
}

.audio-player {
  width: 100%;
  height: 40px;
}

.audio-player::-webkit-media-controls-panel {
  background-color: rgba(50, 50, 80, 0.8);
  border-radius: 5px;
}
.audio-player::-webkit-media-controls-play-button,
.audio-player::-webkit-media-controls-volume-slider,
.audio-player::-webkit-media-controls-mute-button,
.audio-player::-webkit-media-controls-timeline,
.audio-player::-webkit-media-controls-current-time-display,
.audio-player::-webkit-media-controls-time-remaining-display {
  filter: invert(1) sepia(0.5) saturate(5) hue-rotate(190deg); 
}

</style>
