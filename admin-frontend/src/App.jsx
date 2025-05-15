// admin-frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // Importa el AuthProvider

// Importa los componentes de página y layout
import LoginPage from './pages/LoginPage';
// import AdminLayout from './components/Layout/AdminLayout'; // AdminLayout se usa dentro de ProtectedRoute
import ProtectedRoute from './components/Auth/ProtectedRoute';
import MediaPage from './pages/MediaPage'; 
import ActivatorsPage from './pages/ActivatorsPage'; // Importamos la página real de Activadores

// Placeholder para la página de Dashboard
const DashboardPagePlaceholder = () => (
  <div className="p-6 text-slate-700">
    <h2 className="text-2xl font-semibold mb-4">Bienvenido al Dashboard</h2>
    <p>Este es el panel principal. Desde aquí podrás tener una vista general y acceder a las diferentes secciones de administración.</p>
    <p className="mt-2">Próximamente: Estadísticas y accesos directos.</p>
  </div>
);

// Ya no necesitamos ActivatorsPagePlaceholder
// const ActivatorsPagePlaceholder = () => (
//   <div className="p-6 text-slate-700">
//     <h2 className="text-2xl font-semibold mb-4">Gestión de Activadores</h2>
//     <p>Crea y configura los activadores. Cada activador se asocia a un visualizador y puede tener asignado un archivo multimedia.</p>
//     <p className="mt-2">Próximamente: Formulario para crear activadores y listado para gestionarlos.</p>
//   </div>
// );

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
    <AuthProvider> {/* Envuelve toda la aplicación con AuthProvider */}
      <Routes>
        {/* Ruta pública para el login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas que usarán AdminLayout */}
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
              <ActivatorsPage /> {/* Usamos el componente ActivatorsPage real */}
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="*" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <NotFoundPage />
            </ProtectedRoute>
          } 
        />

      </Routes>
    </AuthProvider>
  );
}

export default App;
