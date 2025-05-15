// admin-frontend/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Importa tus estilos globales (incluyendo Tailwind)
import { BrowserRouter } from 'react-router-dom'; // Para el enrutamiento

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter envuelve tu App para habilitar el enrutamiento */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
