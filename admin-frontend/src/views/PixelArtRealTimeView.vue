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
// Asume que tienes una forma de obtener el ID del activador actual, por ejemplo, desde la ruta
// import { useRoute } from 'vue-router'; // Si usas Vue Router

// --- Variables Reactivas del Componente ---
const pixelArtData = ref(null); // Almacenará todos los datos del pixel art (píxeles, audioUrl, logoUrl, etc.)
const pixels = ref([]);         // Array de objetos de píxeles para renderizar
const logoUrl = ref('');        // URL del logo
const audioUrlFromData = ref(''); // URL del audio
const pixelArtName = ref('');   // Nombre del Pixel Art

// Refs para elementos del DOM
const pixelRefs = ref([]);        // Para los elementos DOM de los píxeles
const logoRef = ref(null);        // Para el elemento <img> del logo
const audioPlayerElementRef = ref(null); // Para el elemento <audio>

// Estado de la sincronización de música
const musicStatusMessage = ref('Cargando...');

// --- Configuración de la Web Audio API y Detección de Beats ---
let audioContext = null;
let analyserNode = null;
let mediaElementSourceNode = null;
let frequencyDataArray = null;
let animationFrameId = null;

const BEAT_THRESHOLD_INITIAL = 150; // Umbral de energía para detectar un beat (0-255)
let currentBeatThreshold = BEAT_THRESHOLD_INITIAL;
const BEAT_COOLDOWN_MS = 180;       // Tiempo mínimo entre detecciones de beats
let lastBeatTimestamp = 0;
const BASS_FREQ_START_BIN = 0;    // Bin inicial para el rango de bajos
const BASS_FREQ_END_BIN = 5;      // Bin final para el rango de bajos (ajustar para sensibilidad)

const beatEffectColorPalette = [ // Paleta opcional para efectos de beat
    '#FF5733', '#FFBD33', '#75FF33', '#33FFBD', 
    '#3375FF', '#BD33FF', '#FF3375', '#FFFFFF' 
];
let lastUsedBeatColorIndex = -1;

// --- Lógica del Componente ---

// 1. Carga de Datos del Pixel Art (DEBES ADAPTAR ESTO A TU SISTEMA)
// Esta función debe obtener los datos del pixel art (píxeles, audioUrl, logoUrl)
// basándose en el activador actual (ej. 'activate01').
async function loadPixelArtConfiguration(activatorId) {
  musicStatusMessage.value = `Cargando configuración para ${activatorId}...`;
  try {
    // >>> Reemplaza esta simulación con tu llamada real al backend o store de Vuex/Pinia <<<
    // Ejemplo: const response = await fetch(`/api/pixelart/${activatorId}`);
    //          const data = await response.json();
    console.log(`Simulando carga para activador: ${activatorId}`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay de red
    
    const simulatedData = { // EJEMPLO DE DATOS - REEMPLAZA ESTO
      id: activatorId,
      name: `Pixel Art ${activatorId}`,
      // IMPORTANTE: Asegúrate que tu backend provea estas URLs correctamente
      audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // URL de ejemplo
      logoUrl: 'https://placehold.co/100x100/3a3a5e/ffffff?text=LOGO', // URL de ejemplo
      pixels: Array.from({ length: 100 }, (_, i) => ({ // 10x10 grid de ejemplo
        id: `px${i}`,
        originalColor: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        // Propiedades de estilo que ya usas para posicionar/dimensionar tus píxeles
        // Estas son de ejemplo, usa las tuyas:
        x: (i % 10) * 10, // %
        y: Math.floor(i / 10) * 10, // %
        width: 10, // %
        height: 10, // %
        currentStyle: {} // Para estilos dinámicos
      }))
    };
    // >>> Fin de la simulación <<<

    pixelArtData.value = simulatedData; // data;
    pixels.value = simulatedData.pixels.map(p => ({ ...p, currentStyle: { backgroundColor: p.originalColor } }));
    logoUrl.value = simulatedData.logoUrl;
    audioUrlFromData.value = simulatedData.audioUrl;
    pixelArtName.value = simulatedData.name;

    musicStatusMessage.value = `Listo: ${pixelArtName.value}.`;

    if (audioUrlFromData.value) {
      await nextTick(); // Esperar a que el DOM (audioPlayerElementRef) esté disponible
      initializeAudioSynchronization();
    } else {
      musicStatusMessage.value = "No hay audio configurado para este Pixel Map.";
    }

  } catch (error) {
    console.error("Error cargando datos del Pixel Art:", error);
    musicStatusMessage.value = "Error al cargar la configuración del Pixel Map.";
    // Considera mostrar un mensaje de error más amigable al usuario
  }
}

// 2. Funciones para Estilos Dinámicos (ya las tienes, adáptalas si es necesario)
const visualizerAreaStyle = computed(() => ({
  width: '80vw', // Ejemplo
  height: '70vh', // Ejemplo
  maxWidth: '800px',
  maxHeight: '600px',
  position: 'relative',
  backgroundColor: '#111', // Fondo oscuro para el área de visualización
  border: '1px solid #333',
  borderRadius: '8px',
  overflow: 'hidden', // Para que los píxeles no se salgan
  cursor: (audioContext && audioContext.state === 'suspended') ? 'pointer' : 'default',
}));

const getPixelRuntimeStyle = (pixel) => {
  // Combina los estilos base de posicionamiento con los estilos dinámicos del beat
  return {
    position: 'absolute',
    left: `${pixel.x}%`,
    top: `${pixel.y}%`,
    width: `${pixel.width}%`,
    height: `${pixel.height}%`,
    transition: 'background-color 0.05s ease-out, transform 0.1s ease-out, filter 0.1s ease-out',
    ...pixel.currentStyle, // Estilos aplicados por el efecto del beat
  };
};

const logoStyle = computed(() => ({
    position: 'absolute',
    // Centrar el logo (ejemplo, ajusta según tu diseño)
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: '20%', // Tamaño relativo al contenedor
    maxHeight: '20%',
    objectFit: 'contain',
    zIndex: 10, // Para que esté sobre los píxeles
    transition: 'transform 0.1s ease-out, filter 0.1s ease-out', // Para efectos suaves
}));


// Helper para asignar refs de píxeles
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

  if (!audioContext) { // Crear AudioContext solo una vez
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256; // Tamaño de la FFT (potencia de 2)
      const bufferLength = analyserNode.frequencyBinCount; // La mitad de fftSize
      frequencyDataArray = new Uint8Array(bufferLength); // Array para datos de frecuencia
    } catch (e) {
      console.error("Error inicializando Web Audio API:", e);
      musicStatusMessage.value = "Error: Web Audio API no disponible o bloqueada.";
      return;
    }
  }

  audioPlayerElementRef.value.src = audioUrlFromData.value;
  audioPlayerElementRef.value.crossOrigin = "anonymous"; // Necesario si el audio es de otro dominio

  const setupAndPlay = () => {
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(actuallySetupAndPlay).catch(e => {
        musicStatusMessage.value = "Haz clic para activar audio.";
        console.warn("Reanudar AudioContext falló, esperando interacción del usuario.", e);
      });
    } else {
      actuallySetupAndPlay();
    }
  };

  const actuallySetupAndPlay = () => {
    if (mediaElementSourceNode) { // Desconectar fuente anterior si existe
      mediaElementSourceNode.disconnect();
    }
    try {
      mediaElementSourceNode = audioContext.createMediaElementSource(audioPlayerElementRef.value);
      mediaElementSourceNode.connect(analyserNode);
      analyserNode.connect(audioContext.destination); // Conectar a los altavoces

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
  
  // Los navegadores modernos requieren interacción del usuario para iniciar audio.
  // Esta función se llama al montar o si el usuario hace clic en el área.
  const attemptToPlayAudio = () => {
     if (audioContext && audioPlayerElementRef.value && audioPlayerElementRef.value.src) {
        if (audioContext.state === 'running') {
            if (audioPlayerElementRef.value.readyState >= HTMLMediaElement.HAVE_METADATA || audioPlayerElementRef.value.src) { // HAVE_METADATA puede no ser suficiente si src se setea tarde
                setupAndPlay();
            } else {
                audioPlayerElementRef.value.addEventListener('loadedmetadata', setupAndPlay, { once: true });
            }
        } else { // 'suspended'
            musicStatusMessage.value = "Audio pausado. Haz clic en el visualizador para iniciar.";
            // El clic en `visualizer-area` llamará a handleUserInteraction -> setupAndPlay
        }
     }
  };
  
  // Listener para errores en el elemento audio
  audioPlayerElementRef.value.addEventListener('error', (e) => {
    console.error("Error en elemento <audio>:", e);
    musicStatusMessage.value = "Error cargando archivo de audio. Verifica la URL y CORS.";
  });
  
  // Intentar reproducir cuando los metadatos estén listos
   if (audioPlayerElementRef.value.readyState >= HTMLMediaElement.HAVE_METADATA) {
        attemptToPlayAudio();
    } else {
        audioPlayerElementRef.value.addEventListener('loadedmetadata', attemptToPlayAudio, { once: true });
    }
}

function handleUserInteraction() {
  if (audioContext && audioContext.state === 'suspended') {
    console.log("Interacción del usuario detectada, intentando reanudar AudioContext.");
    audioContext.resume().then(() => {
      musicStatusMessage.value = "Audio activado.";
      // Si el reproductor está listo y no reproduciendo, intentar de nuevo.
      if (audioPlayerElementRef.value && audioPlayerElementRef.value.paused && audioPlayerElementRef.value.src) {
         initializeAudioSynchronization(); // Re-intenta la configuración y reproducción
      }
    }).catch(e => console.error("Error reanudando AudioContext tras interacción:", e));
  } else if (audioContext && audioPlayerElementRef.value && audioPlayerElementRef.value.paused && audioPlayerElementRef.value.src) {
    // Si el contexto está corriendo pero el audio pausado, intentar reproducir
    audioPlayerElementRef.value.play().catch(e => console.error("Error al reproducir tras interacción:", e));
  }
}


function renderMusicVisualizationFrame() {
  animationFrameId = requestAnimationFrame(renderMusicVisualizationFrame);

  if (!analyserNode || !frequencyDataArray || !audioContext || audioContext.state !== 'running') {
    return; // No hacer nada si el audio no está listo o el contexto no está corriendo
  }

  analyserNode.getByteFrequencyData(frequencyDataArray); // Obtener datos de frecuencia

  let bassEnergy = 0;
  const endBin = Math.min(BASS_FREQ_END_BIN, frequencyDataArray.length - 1);
  const startBin = Math.min(BASS_FREQ_START_BIN, endBin);

  if (frequencyDataArray.length > 0 && endBin >= startBin) {
    for (let i = startBin; i <= endBin; i++) {
      bassEnergy += frequencyDataArray[i];
    }
    bassEnergy /= (endBin - startBin + 1); // Promedio de energía en el rango de bajos
  }

  const currentTime = Date.now();
  if (bassEnergy > currentBeatThreshold && (currentTime - lastBeatTimestamp) > BEAT_COOLDOWN_MS) {
    lastBeatTimestamp = currentTime;

    let beatColorIndex; // Seleccionar un color de la paleta para el efecto
    do {
      beatColorIndex = Math.floor(Math.random() * beatEffectColorPalette.length);
    } while (beatColorIndex === lastUsedBeatColorIndex && beatEffectColorPalette.length > 1);
    const chosenBeatColor = beatEffectColorPalette[beatColorIndex];
    lastUsedBeatColorIndex = beatColorIndex;

    // Llamar a la función que actualiza los visuales (píxeles y logo)
    actualizarVisualesConBeat({
      energia: bassEnergy,
      colorSugerido: chosenBeatColor, // Puedes usar este color o ignorarlo
      timestamp: currentTime
    });

    // Ajustar umbral dinámicamente (simple)
    currentBeatThreshold = Math.max(BEAT_THRESHOLD_INITIAL * 0.7, bassEnergy * 0.85);
  } else if (bassEnergy < currentBeatThreshold * 0.9 && currentBeatThreshold > BEAT_THRESHOLD_INITIAL * 0.7) {
    currentBeatThreshold *= 0.995; // Reducir lentamente el umbral si no hay beats fuertes
  }
}

// 4. FUNCIÓN CLAVE: Actualizar Visuales (Píxeles y Logo) con el Beat
//    ¡DEBES PERSONALIZAR ESTA FUNCIÓN EXTENSAMENTE!
function actualizarVisualesConBeat(datosDelBeat) {
  // musicStatusMessage.value = `Beat! E:${datosDelBeat.energia.toFixed(0)}`; // Para depuración

  const beatIntensity = Math.min(1, datosDelBeat.energia / 220); // Normalizar intensidad (0-1)

  // A. Actualizar los Píxeles
  pixels.value.forEach((pixelData, index) => {
    // const pixelDomElement = pixelRefs.value[index]; // Ya no es necesario si modificas pixelData.currentStyle
    if (pixelData) {
      // EJEMPLO DE EFECTO: "Pulsar" el brillo del color original del píxel
      // Necesitarás convertir el color original a HSL o similar para manipular el brillo fácilmente,
      // o usar `filter: brightness(...)`. Aquí un ejemplo simple con filter:
      
      const originalPixelColor = pixelData.originalColor;
      // Aplicar un efecto de "flash" o cambio de color temporal
      pixelData.currentStyle = {
        ...pixelData.currentStyle, // Mantener otros estilos si los hay
        backgroundColor: datosDelBeat.colorSugerido, // Flash con color del beat
        transform: `scale(${1 + beatIntensity * 0.1})`, // Pequeño escalado
        filter: `brightness(${1 + beatIntensity * 0.4})` // Aumentar brillo
      };

      setTimeout(() => {
        // Volver al estado original del píxel
        pixelData.currentStyle = {
          backgroundColor: originalPixelColor,
          transform: 'scale(1)',
          filter: 'brightness(1)'
        };
      }, BEAT_COOLDOWN_MS * 0.7); // Duración del efecto
    }
  });

  // B. Actualizar el Logo
  if (logoRef.value) {
    const logoElement = logoRef.value;
    // EJEMPLO DE EFECTO: Hacer que el logo "pulse" o cambie de tamaño/sombra
    logoElement.style.transform = `translate(-50%, -50%) scale(${1 + beatIntensity * 0.05})`; // Escalar un poco
    logoElement.style.filter = `drop-shadow(0 0 ${Math.round(beatIntensity * 10)}px ${datosDelBeat.colorSugerido}) brightness(${1 + beatIntensity * 0.2})`;

    setTimeout(() => {
      logoElement.style.transform = 'translate(-50%, -50%) scale(1)';
      logoElement.style.filter = 'drop-shadow(0 0 0px transparent) brightness(1)';
    }, BEAT_COOLDOWN_MS * 0.7);
  }
}


// --- Ciclo de Vida del Componente y Observadores ---
onMounted(async () => {
  pixelRefs.value = []; // Resetear refs
  
  // Obtener el ID del activador (ej. 'activate01') - DEBES IMPLEMENTAR ESTO
  // Ejemplo: const route = useRoute();
  // const activatorId = route.params.id;
  const currentActivatorId = window.location.pathname.split('/').pop() || 'default'; // Ejemplo simple
  
  await loadPixelArtConfiguration(currentActivatorId);
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
    audioContext = null; // Importante para permitir recreación si el componente se remonta
  }
  // Limpiar listeners de eventos si se añadieron al 'document'
});

// Observador opcional: si el `audioUrlFromData` puede cambiar dinámicamente
// mientras el componente está montado (ej. seleccionando otro Pixel Art).
watch(audioUrlFromData, (newUrl, oldUrl) => {
  if (newUrl && newUrl !== oldUrl && audioPlayerElementRef.value) {
    console.log("Nueva URL de audio detectada, reiniciando sincronización:", newUrl);
    // Detener reproducción y análisis actual
    if (audioPlayerElementRef.value) audioPlayerElementRef.value.pause();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (mediaElementSourceNode) mediaElementSourceNode.disconnect();
    
    // Reiniciar el proceso con la nueva URL
    // Es posible que necesites cerrar y reabrir el AudioContext o simplemente
    // crear una nueva fuente si el AudioContext puede ser reutilizado.
    // Por simplicidad, aquí se re-llama a initializeAudioSynchronization que maneja la creación si es null.
    // Si audioContext ya existe, se reutilizará.
    initializeAudioSynchronization();
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
  height: 100vh; /* Ocupa toda la altura de la ventana */
  background-color: #0a0a1e; /* Fondo general muy oscuro */
  padding: 20px;
  box-sizing: border-box;
}

.visualizer-area {
  /* Estilos definidos en computed property: visualizerAreaStyle */
  display: flex; /* Para centrar el logo si no hay píxeles, o para otros layouts */
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.pixel-element {
  /* Estilos base definidos en computed property: getPixelRuntimeStyle */
  /* Puedes añadir bordes o efectos base aquí si todos los píxeles los comparten */
  /* box-shadow: 0 0 2px rgba(255,255,255,0.1); */
}

.pixel-art-logo {
  /* Estilos base definidos en computed property: logoStyle */
  /* Ejemplo: border: 2px solid rgba(255,255,255,0.5); */
  /* border-radius: 50%; */ /* Si quieres logo redondo */
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
  min-height: 1.2em; /* Para evitar saltos de layout cuando cambia el texto */
}

.audio-player {
  width: 100%;
  height: 40px;
}

/* Estilos para el reproductor de audio (puedes personalizarlos más) */
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
  filter: invert(1) sepia(0.5) saturate(5) hue-rotate(190deg); /* Ejemplo de filtro para cambiar color */
}

</style>
