// admin-frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // Importa el AuthProvider

// Importa los componentes de página y layout
import LoginPage from './pages/LoginPage'; // Ya lo creamos
import AdminLayout from './components/Layout/AdminLayout'; // Ya lo creamos
import ProtectedRoute from './components/Auth/ProtectedRoute'; // Ya lo creamos

// Placeholders para las páginas de contenido (las crearemos más adelante)
const DashboardPagePlaceholder = () => (
  <div className="p-6 text-slate-700">
    <h2 className="text-2xl font-semibold mb-4">Bienvenido al Dashboard</h2>
    <p>Este es el panel principal. Desde aquí podrás tener una vista general y acceder a las diferentes secciones de administración.</p>
    <p className="mt-2">Próximamente: Estadísticas y accesos directos.</p>
  </div>
);
const MediaPagePlaceholder = () => (
  <div className="p-6 text-slate-700">
    <h2 className="text-2xl font-semibold mb-4">Gestión de Multimedia</h2>
    <p>Aquí podrás subir, ver y eliminar las imágenes y videos que se usarán en los visualizadores.</p>
    <p className="mt-2">Próximamente: Formulario de subida y listado de archivos.</p>
  </div>
);
const ActivatorsPagePlaceholder = () => (
  <div className="p-6 text-slate-700">
    <h2 className="text-2xl font-semibold mb-4">Gestión de Activadores</h2>
    <p>Crea y configura los activadores. Cada activador se asocia a un visualizador y puede tener asignado un archivo multimedia.</p>
    <p className="mt-2">Próximamente: Formulario para crear activadores y listado para gestionarlos.</p>
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
    <AuthProvider> {/* Envuelve toda la aplicación con AuthProvider */}
      <Routes>
        {/* Ruta pública para el login */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas que usarán AdminLayout */}
        {/* El componente ProtectedRoute se encarga de la lógica de autenticación y de renderizar AdminLayout */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin']}> {/* Solo admins pueden acceder */}
              <DashboardPagePlaceholder />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/media" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MediaPagePlaceholder />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/activators" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ActivatorsPagePlaceholder />
            </ProtectedRoute>
          } 
        />
        
        {/* Redirección por defecto: 
            - Si el usuario intenta ir a la raíz "/", ProtectedRoute manejará la lógica.
            - Si está autenticado y es admin, irá al dashboard (o a la página desde la que fue redirigido).
            - Si no está autenticado, será redirigido a /login por ProtectedRoute.
        */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          } 
        />
        
        {/* Ruta para manejar 404 (Página No Encontrada) */}
        {/* Esta ruta debe estar al final para que capture cualquier ruta no definida previamente */}
        <Route 
          path="*" 
          element={
            <ProtectedRoute allowedRoles={['admin']}> {/* Para que el 404 se muestre dentro del layout si está logueado */}
              <NotFoundPage />
            </ProtectedRoute>
          } 
        />
        {/* Si quieres un 404 público (fuera del layout si no está logueado), necesitarías una lógica más compleja
            o definir una ruta 404 fuera de ProtectedRoute que se muestre si ninguna otra ruta coincide Y NO está autenticado.
            Por simplicidad, este 404 se mostrará dentro del layout si está logueado y accede a una ruta inválida.
            Si no está logueado y accede a una ruta inválida, será redirigido a /login.
        */}

      </Routes>
    </AuthProvider>
  );
}

export default App;
