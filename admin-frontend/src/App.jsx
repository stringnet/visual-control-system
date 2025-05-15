// admin-frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // Importa el AuthProvider

// Importa los componentes de página y layout
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import MediaPage from './pages/MediaPage'; 
import ActivatorsPage from './pages/ActivatorsPage';
import VisualizerDisplayPage from './pages/VisualizerDisplayPage'; // Importamos la página del Visualizador

// Placeholder para la página de Dashboard
const DashboardPagePlaceholder = () => (
  <div className="p-6 text-slate-700">
    <h2 className="text-2xl font-semibold mb-4">Bienvenido al Dashboard</h2>
    <p>Este es el panel principal. Desde aquí podrás tener una vista general y acceder a las diferentes secciones de administración.</p>
    <p className="mt-2">Próximamente: Estadísticas y accesos directos.</p>
  </div>
);

const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-10">
    <h1 className="text-6xl font-bold text-blue-600 mb-4">404</h1>
    <h2 className="text-2xl font-semibold text-slate-700 mb-3">Página No Encontrada</h2>
    <p className="text-slate-500 mb-6">Lo sentimos, la página que buscas no existe o ha sido movida.</p>
    <button
      onClick={() => window.history.back()} // Intenta volver a la página anterior
      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
    >
      Volver Atrás
    </button>
  </div>
);


function App() {
  return (
    <AuthProvider> {/* AuthProvider envuelve todas las rutas */}
      <Routes>
        {/* Ruta pública para el login del panel de administración */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas para el panel de administración */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardPagePlaceholder />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/media" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MediaPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/activators" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ActivatorsPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Ruta pública para los Visualizadores */}
        {/* Esta ruta no está envuelta en ProtectedRoute porque es para el público */}
        <Route 
          path="/visualizer/:visualizerId" 
          element={<VisualizerDisplayPage />} 
        />
        
        {/* Redirección por defecto para la raíz del panel de administración */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          } 
        />
        
        {/* Ruta para manejar 404 dentro del panel de administración (si está logueado) */}
        {/* Si se accede a una ruta no definida y está logueado, muestra este 404 */}
        <Route 
          path="*" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <NotFoundPage />
            </ProtectedRoute>
          } 
        />
        {/* Nota: Si se accede a una ruta totalmente desconocida y no está logueado, 
            React Router podría no tener un "catch-all" público a menos que se defina uno explícitamente
            fuera de cualquier ProtectedRoute. Por ahora, las rutas no definidas del panel admin
            lo llevarán al login si no está autenticado.
            Si se accede a /visualizer/ruta-inexistente, VisualizerDisplayPage manejará el error
            de contenido no encontrado.
        */}

      </Routes>
    </AuthProvider>
  );
}

export default App;
