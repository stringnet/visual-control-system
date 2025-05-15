// admin-frontend/src/services/api.js
import axios from 'axios';

// La URL base de tu API backend.
// Vite reemplazará import.meta.env.VITE_API_URL con el valor que configures
// en las variables de entorno de build en Easypanel (o en un .env local para desarrollo).
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'; // Fallback para desarrollo local si no está definida

// Crear una instancia de Axios con configuración personalizada
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Puedes añadir otras cabeceras comunes aquí si es necesario
  },
});

// Interceptor de Peticiones (Request Interceptor)
// Este interceptor se ejecuta ANTES de que cada petición sea enviada.
// Lo usamos para adjuntar el token JWT a las cabeceras de autorización si está disponible.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Manejar errores de la configuración de la petición
    return Promise.reject(error);
  }
);

// Interceptor de Respuestas (Response Interceptor) - Opcional pero recomendado
// Este interceptor se ejecuta DESPUÉS de recibir una respuesta del servidor.
// Útil para manejar errores globales, como un token expirado (error 401).
api.interceptors.response.use(
  (response) => {
    // Cualquier código de estado que se encuentre dentro del rango de 2xx causa que esta función se active
    // No hacer nada, solo devolver la respuesta
    return response;
  },
  (error) => {
    // Cualquier código de estado que caiga fuera del rango de 2xx causa que esta función se active
    // Manejar errores de respuesta aquí
    if (error.response && error.response.status === 401) {
      // Si el error es 401 (No Autorizado), podría significar que el token es inválido o ha expirado.
      // Aquí podrías, por ejemplo, desloguear al usuario y redirigirlo al login.
      // Esta lógica es mejor manejarla en AuthContext, pero es bueno saber que se puede hacer aquí.
      console.warn("Interceptor API: Error 401 - No autorizado. El token podría haber expirado.");
      // localStorage.removeItem('authToken');
      // delete api.defaults.headers.common['Authorization'];
      // Redirigir al login (esto es más complejo de hacer desde aquí directamente,
      // usualmente se maneja en el AuthContext o en el componente que hizo la llamada)
      // window.location.href = '/login'; // No recomendado para SPAs, usar React Router
    }
    return Promise.reject(error);
  }
);

export default api;
