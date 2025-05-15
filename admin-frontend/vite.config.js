// admin-frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Puerto por defecto para el servidor de desarrollo de Vite
    strictPort: true, // Falla si el puerto ya está en uso
    // Opcional: Configurar un proxy para la API en desarrollo
    // proxy: {
    //   '/api': { // Cualquier petición a /api será redirigida
    //     target: 'http://localhost:3001', // URL de tu backend local
    //     changeOrigin: true,
    //     // rewrite: (path) => path.replace(/^\/api/, '') // Si necesitas quitar /api del path
    //   }
    // }
  },
  build: {
    outDir: 'dist', // Carpeta de salida para el build
  }
})
