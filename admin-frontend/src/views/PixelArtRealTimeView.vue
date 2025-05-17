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
// import { useRoute } from 'vue-router'; // Si usas Vue Router para obtener el activatorId
// import io from 'socket.io-client'; // Si usas Socket.io para recibir datos

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

// --- Configuración de la Web Audio API y Detección de Beats ---
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

// --- Lógica del Componente ---

// 1. PROCESAMIENTO DE DATOS DEL PIXEL ART RECIBIDOS DEL BACKEND
// Esta función ahora procesa los datos que vienen de tu backend
// (ej. a través de un evento WebSocket o una llamada API inicial).
function processPixelArtData(receivedContent) {
  // receivedContent es el objeto que mostraste en el log:
  // { mediaType: 'pixelmap', pixelMapConfig: { colors: [], logoUrl: '', ... }, originalName: '' }
  
  if (!receivedContent || receivedContent.mediaType !== 'pixelmap' || !receivedContent.pixelMapConfig) {
    musicStatusMessage.value = "Datos del Pixel Map inválidos o no recibidos.";
    console.error("Datos del Pixel Map inválidos:", receivedContent);
    pixels.value = []; // Limpiar píxeles si los datos son incorrectos
    logoUrl.value = '';
    audioUrlFromData.value = '';
    return;
  }

  const config = receivedContent.pixelMapConfig;
  
  musicStatusMessage.value = `Configurando: ${receivedContent.originalName || 'Pixel Map'}`;
  
  pixelArtData.value = receivedContent; // Guardar todos los datos recibidos
  pixelArtName.value = receivedContent.originalName || 'Pixel Map sin nombre';
  logoUrl.value = config.logoUrl || '';
  audioUrlFromData.value = config.audioUrl || '';

  // Procesar los píxeles y sus colores base
  // ASUNCIÓN: La ESTRUCTURA de la cuadrícula (ej. 10x10) se define aquí en el frontend
  // o también podría venir del backend si tuvieras una propiedad 'gridLayout' o similar.
  // Por ahora, creamos una cuadrícula de ejemplo 10x10.
  const numGridRows = 10;
  const numGridCols = 10;
  const totalPixelsInGrid = numGridRows * numGridCols;
  const newPixelsArray = [];

  if (config.colors && config.colors.length > 0) {
    for (let i = 0; i < totalPixelsInGrid; i++) {
      // Asignar colores del backend de forma cíclica a la cuadrícula
      const colorFromBackend = config.colors[i % config.colors.length];
      newPixelsArray.push({
        id: `px${i}`,
        originalColor: colorFromBackend,
        x: (i % numGridCols) * (100 / numGridCols), // %
        y: Math.floor(i / numGridCols) * (100 / numGridRows), // %
        width: (100 / numGridCols), // %
        height: (100 / numGridRows), // %
        currentStyle: { backgroundColor: colorFromBackend } // Estilo inicial
      });
    }
  } else {
    // Fallback si no hay colores definidos en el backend (quizás mostrar píxeles grises o un mensaje)
    console.warn("No se proporcionaron colores en pixelMapConfig. Creando píxeles con color por defecto.");
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

  if (audioUrlFromData.value) {
    nextTick().then(() => { // Esperar a que el DOM (audioPlayerElementRef) esté disponible
      initializeAudioSynchronization();
    });
  } else {
    musicStatusMessage.value = "No hay audio configurado para este Pixel Map.";
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
  if (!audioUrlFromData.value || !audioPlayerElementRef.value) {
    musicStatusMessage.value = "Falta URL de audio o reproductor no está listo.";
    return;
  }

  if (!audioContext) { 
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256; 
      const bufferLength = analyserNode.frequencyBinCount; 
      frequencyDataArray = new Uint8Array(bufferLength); 
    } catch (e) {
      console.error("Error inicializando Web Audio API:", e);
      musicStatusMessage.value = "Error: Web Audio API no disponible o bloqueada.";
      return;
    }
  }

  audioPlayerElementRef.value.src = audioUrlFromData.value;
  audioPlayerElementRef.value.crossOrigin = "anonymous"; 

  const setupAndPlay = () => {
    // Asegurarse de que el AudioContext esté activo antes de conectar nodos
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(actuallySetupAndPlay).catch(e => {
        musicStatusMessage.value = "Haz clic en el visualizador para activar audio.";
        console.warn("Reanudar AudioContext falló, esperando interacción del usuario.", e);
      });
    } else {
      actuallySetupAndPlay();
    }
  };

  const actuallySetupAndPlay = () => {
    if (mediaElementSourceNode) { 
      mediaElementSourceNode.disconnect();
    }
    try {
      mediaElementSourceNode = audioContext.createMediaElementSource(audioPlayerElementRef.value);
      mediaElementSourceNode.connect(analyserNode);
      analyserNode.connect(audioContext.destination); 

      audioPlayerElementRef.value.play().then(() => {
        musicStatusMessage.value = "¡Sincronizando con la música!";
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        renderMusicVisualizationFrame();
      }).catch(e => {
        console.error("Error al reproducir audio:", e);
        musicStatusMessage.value = "Error al reproducir. Verifica la URL/formato del audio.";
      });
    } catch (error) {
      console.error("Error configurando fuente de audio:", error);
      musicStatusMessage.value = "Error al iniciar análisis de audio.";
    }
  };
  
  const attemptToPlayAudio = () => {
     if (audioContext && audioPlayerElementRef.value && audioPlayerElementRef.value.src) { // Asegurarse que src esté seteado
        if (audioContext.state === 'running') {
            // Chequear readyState para asegurar que el audio está listo para ser conectado
            if (audioPlayerElementRef.value.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) { 
                setupAndPlay();
            } else {
                // Si no está listo, esperar al evento 'canplaythrough' o 'loadeddata'
                audioPlayerElementRef.value.addEventListener('canplaythrough', setupAndPlay, { once: true });
            }
        } else { 
            musicStatusMessage.value = "Audio pausado. Haz clic en el visualizador para iniciar.";
        }
     }
  };
  
  audioPlayerElementRef.value.addEventListener('error', (e) => {
    console.error("Error en elemento <audio>:", e);
    musicStatusMessage.value = "Error cargando archivo de audio. Verifica la URL y CORS.";
  });
  
   if (audioPlayerElementRef.value.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) { // HAVE_ENOUGH_DATA es más robusto
        attemptToPlayAudio();
    } else {
        audioPlayerElementRef.value.addEventListener('canplaythrough', attemptToPlayAudio, { once: true });
    }
}

function handleUserInteraction() {
  if (audioContext && audioContext.state === 'suspended') {
    console.log("Interacción del usuario detectada, intentando reanudar AudioContext.");
    audioContext.resume().then(() => {
      musicStatusMessage.value = "Audio activado.";
      if (audioPlayerElementRef.value && audioPlayerElementRef.value.paused && audioPlayerElementRef.value.src) {
         initializeAudioSynchronization(); 
      }
    }).catch(e => console.error("Error reanudando AudioContext tras interacción:", e));
  } else if (audioContext && audioPlayerElementRef.value && audioPlayerElementRef.value.paused && audioPlayerElementRef.value.src) {
    audioPlayerElementRef.value.play().catch(e => console.error("Error al reproducir tras interacción:", e));
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

  // A. Actualizar los Píxeles
  pixels.value.forEach((pixelData) => { // No necesitamos 'index' si modificamos pixelData directamente
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

  // B. Actualizar el Logo
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
  pixelRefs.value = []; 
  
  // Obtener el ID del activador (ej. 'activate01')
  // Este es un ejemplo simple. Si usas Vue Router, usa `useRoute().params.id`
  const activatorIdFromPath = window.location.pathname.split('/').pop() || 'default'; 
  
  // Si recibes datos vía WebSocket:
  // 1. Establece la conexión con el servidor WebSocket aquí.
  // 2. Define un listener para el evento 'contentUpdate' (o como lo llames).
  //    socket.on('contentUpdate', (data) => {
  //        if (data.activatorId === activatorIdFromPath) { // Asegúrate que es para este activador
  //            console.log("Datos recibidos vía WebSocket:", data);
  //            processPixelArtData(data.content); // 'content' es el objeto que mostraste en el log
  //        }
  //    });
  // 3. Podrías necesitar emitir un evento al servidor para "unirte" a la sala del activador:
  //    socket.emit('joinRoom', activatorIdFromPath);

  // SI NO USAS WEBSOCKETS y necesitas cargar datos con una llamada API al montar:
  // Llama a una función que haga el fetch y luego llame a processPixelArtData.
  // Ejemplo:
  // async function fetchInitialData(activatorId) {
  //   try {
  //     musicStatusMessage.value = `Cargando configuración para ${activatorId}...`;
  //     const response = await fetch(`/api/pixelart-config/${activatorId}`); // TU ENDPOINT REAL
  //     if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
  //     const data = await response.json(); // Asume que tu API devuelve el objeto como el log
  //     processPixelArtData(data); // data debería tener la estructura { mediaType, pixelMapConfig, originalName }
  //   } catch (error) {
  //     console.error("Error fetching initial Pixel Art data:", error);
  //     musicStatusMessage.value = "Error al cargar configuración inicial.";
  //   }
  // }
  // fetchInitialData(activatorIdFromPath);

  // --- SIMULACIÓN DE RECEPCIÓN DE DATOS (para prueba si no tienes WebSocket o API lista) ---
  // Esto simula que recibes los datos del log después de un momento.
  // ¡¡¡REEMPLAZA ESTO CON TU LÓGICA REAL DE WEBSOCKETS O FETCH API!!!
  console.warn("Usando datos simulados para processPixelArtData. Reemplaza con tu lógica real de carga de datos (WebSocket/API).");
  setTimeout(() => {
      const simulatedBackendData = { // Basado en tu log
          mediaType: 'pixelmap',
          pixelMapConfig: {
              colors: [ '#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#F000FF' ],
              logoUrl: 'https://res.cloudinary.com/ditgncrxp/image/upload/v1747450660/easypanel_media/pixelmap_assets/logo_vixionfest_1747450660685.png',
              audioUrl: 'https://res.cloudinary.com/ditgncrxp/video/upload/v1747450663/easypanel_media/pixelmap_assets/audio_vixionfest_1747450661227.mp3',
          },
          originalName: 'Vixionfest (Simulado)'
      };
      processPixelArtData(simulatedBackendData);
  }, 1000); // Simular un pequeño retraso
  // --- FIN DE SIMULACIÓN ---

});

onUnmounted(() => {
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
    audioContext.close().catch(e => console.error("Error cerrando AudioContext:", e));
    audioContext = null; 
  }
  // Si usas WebSockets, desconéctate aquí:
  // if (socket) {
  //   socket.disconnect();
  // }
});

watch(audioUrlFromData, (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl && audioPlayerElementRef.value) {
    console.log("Nueva URL de audio detectada, reiniciando sincronización:", newUrl);
    if (audioPlayerElementRef.value) audioPlayerElementRef.value.pause();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    // Desconectar nodos de audio antes de reconfigurar
    if (mediaElementSourceNode) mediaElementSourceNode.disconnect();
    // No es necesario desconectar analyserNode de destination, pero sí la fuente de él.

    // Esperar al siguiente tick para asegurar que el DOM esté actualizado si es necesario
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
