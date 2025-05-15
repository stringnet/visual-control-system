// admin-frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
// Importaremos componentes de página más adelante
// import LoginPage from './pages/LoginPage';
// import DashboardPage from './pages/DashboardPage';
// import MediaPage from './pages/MediaPage';
// import ActivatorsPage from './pages/ActivatorsPage';
// import ProtectedRoute from './components/Auth/ProtectedRoute';
// import AdminLayout from './components/Layout/AdminLayout';

// Placeholder para páginas (los crearemos más adelante)
const LoginPagePlaceholder = () => {
  const navigate = useNavigate();
  useEffect(() => {
    // Simular login y redirección para pruebas iniciales
    // localStorage.setItem('authToken', 'fakeToken'); // Comenta esto para probar el login real
    // navigate('/dashboard');
  }, [navigate]);
  return <div className="flex items-center justify-center h-screen bg-gray-100">
    <div className="p-8 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-semibold mb-4 text-center text-gray-700">Login (Próximamente)</h1>
      <button 
        onClick={() => {
          localStorage.setItem('authToken', 'fakeToken'); // Simula login
          navigate('/dashboard');
        }}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        Simular Login
      </button>
    </div>
  </div>;
};

const DashboardPagePlaceholder = () => <div className="p-6"><h1 className="text-3xl font-semibold text-gray-800">Dashboard (Próximamente)</h1></div>;
const MediaPagePlaceholder = () => <div className="p-6"><h1 className="text-3xl font-semibold text-gray-800">Gestión de Media (Próximamente)</h1></div>;
const ActivatorsPagePlaceholder = () => <div className="p-6"><h1 className="text-3xl font-semibold text-gray-800">Gestión de Activadores (Próximamente)</h1></div>;

// Placeholder para el layout del admin (lo crearemos más adelante)
const AdminLayoutPlaceholder = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  // Determinar el título basado en la ruta
  let title = "Panel de Administración";
  if (location.pathname.includes("/dashboard")) title = "Dashboard";
  else if (location.pathname.includes("/media")) title = "Multimedia";
  else if (location.pathname.includes("/activators")) title = "Activadores";


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="font-semibold text-xl text-blue-600">VisualControl</span>
            </div>
            <div className="hidden md:block">
              <nav className="ml-10 flex items-baseline space-x-4">
                <button onClick={() => navigate('/dashboard')} className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname.includes('/dashboard') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>Dashboard</button>
                <button onClick={() => navigate('/media')} className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname.includes('/media') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>Multimedia</button>
                <button onClick={() => navigate('/activators')} className={`px-3 py-2 rounded-md text-sm font-medium ${location.pathname.includes('/activators') ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>Activadores</button>
              </nav>
            </div>
            <div className="hidden md:block">
              <button 
                onClick={handleLogout}
                className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-white bg-red-500 hover:bg-red-600"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Título de la página actual */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-4 px-4 sm:px-0">{title}</h1>
          <div className="px-4 py-6 sm:px-0 bg-white shadow rounded-lg">
            {children}
          </div>
        </div>
      </main>
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} VisualControl. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
};

// Placeholder para ruta protegida
const ProtectedRoutePlaceholder = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('authToken'); // Lógica de autenticación simple
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <AdminLayoutPlaceholder>{children}</AdminLayoutPlaceholder>;
};


function App() {
  return (
    <Routes>
      {/* Ruta pública para el login */}
      <Route path="/login" element={<LoginPagePlaceholder />} />

      {/* Rutas protegidas dentro del layout del admin */}
      <Route path="/dashboard" element={<ProtectedRoutePlaceholder><DashboardPagePlaceholder /></ProtectedRoutePlaceholder>} />
      <Route path="/media" element={<ProtectedRoutePlaceholder><MediaPagePlaceholder /></ProtectedRoutePlaceholder>} />
      <Route path="/activators" element={<ProtectedRoutePlaceholder><ActivatorsPagePlaceholder /></ProtectedRoutePlaceholder>} />
      
      {/* Redirección por defecto: si está autenticado va al dashboard, si no, al login */}
      <Route 
        path="/" 
        element={
          localStorage.getItem('authToken') ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } 
      />
      
      {/* Ruta para manejar 404 (opcional, pero buena práctica) */}
      <Route path="*" element={<div className="p-6 text-center"><h1 className="text-2xl">404: Página No Encontrada</h1></div>} />
    </Routes>
  );
}

export default App;
