// admin-frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Asegúrate que Tailwind escanee todos tus archivos de componentes
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Usar Inter como fuente por defecto
      },
      // Aquí puedes extender con tus propios colores, espaciados, etc.
      // colors: {
      //   'primary': '#1DA1F2',
      //   'secondary': '#14171A',
      // },
    },
  },
  plugins: [
    // require('@tailwindcss/forms'), // Descomenta si necesitas estilos para formularios
  ],
}
