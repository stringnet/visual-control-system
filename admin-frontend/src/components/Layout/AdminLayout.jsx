// admin-frontend/src/components/Layout/AdminLayout.jsx
import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Film, Zap, LogOut, Menu, X, Users, Settings, ChevronDown, ChevronUp, UserCircle } from 'lucide-react'; // Iconos

const AdminLayout = ({ children }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirigir al login después de cerrar sesión
  };

  const navLinks = [
    { to: '/dashboard', icon: <LayoutDashboard size={20} />, text: 'Dashboard' },
    { to: '/media', icon: <Film size={20} />, text: 'Multimedia' },
    { to: '/activators', icon: <Zap size={20} />, text: 'Activadores' },
    // Puedes añadir más enlaces aquí, por ejemplo, para usuarios o configuración
    // { to: '/users', icon: <Users size={20} />, text: 'Usuarios' },
    // { to: '/settings', icon: <Settings size={20} />, text: 'Configuración' },
  ];

  const getPageTitle = () => {
    const currentLink = navLinks.find(link => location.pathname.startsWith(link.to));
    return currentLink ? currentLink.text : "Panel de Administración";
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Encabezado */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo y Título del Panel */}
            <div className="flex items-center">
              <NavLink to="/dashboard" className="flex items-center text-blue-600 hover:text-blue-700">
                {/* Puedes reemplazar esto con un logo SVG o una imagen */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 mr-2">
                  <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm0 2.5a.75.75 0 0 1 .75.75v1.563c.066.02.131.042.196.065a11.25 11.25 0 0 1 4.598 2.839.75.75 0 0 1-1.118.995 9.75 9.75 0 0 0-3.86-2.493V12a.75.75 0 0 1-1.5 0V7.913a9.75 9.75 0 0 0-3.86 2.493.75.75 0 0 1-1.118-.995A11.25 11.25 0 0 1 11.25 6.33V5.5a.75.75 0 0 1 .75-.75Zm-2.06 9.06a.75.75 0 0 1 .53-.22h2.06a.75.75 0 0 1 0 1.5H10.47a.75.75 0 0 1-.53-.22.75.75 0 0 1 0-1.06Zm-2.25 2.25a.75.75 0 0 1 .75-.75h5.06a.75.75 0 0 1 0 1.5H8.44a.75.75 0 0 1-.75-.75Z" />
                </svg>
                <span className="font-semibold text-xl">VisualControl</span>
              </NavLink>
            </div>

            {/* Menú de Navegación (Escritorio) */}
            <nav className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                    }`
                  }
                >
                  {link.icon}
                  <span className="ml-2">{link.text}</span>
                </NavLink>
              ))}
            </nav>

            {/* Menú de Usuario y Botón de Menú Móvil */}
            <div className="flex items-center">
              <div className="relative hidden md:block">
                <button 
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-1 hover:bg-slate-100"
                >
                  <UserCircle size={28} className="text-slate-600" />
                  {user && <span className="ml-2 text-slate-700 font-medium hidden lg:block">{user.username}</span>}
                  {userMenuOpen ? <ChevronUp size={16} className="ml-1 text-slate-500" /> : <ChevronDown size={16} className="ml-1 text-slate-500" />}
                </button>
                {userMenuOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    {/* <NavLink to="/profile" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">Mi Perfil</NavLink> */}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <LogOut size={16} className="mr-2" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
              <div className="md:hidden">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                  aria-expanded="false"
                >
                  <span className="sr-only">Abrir menú principal</span>
                  {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Menú Móvil */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)} // Cerrar menú al hacer clic
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-md text-base font-medium ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-700 hover:bg-slate-200 hover:text-slate-800'
                    }`
                  }
                >
                  {link.icon}
                  <span className="ml-3">{link.text}</span>
                </NavLink>
              ))}
            </div>
            <div className="pt-4 pb-3 border-t border-slate-200">
              {user && (
                <div className="flex items-center px-5 mb-3">
                  <UserCircle size={32} className="text-slate-600" />
                  <div className="ml-3">
                    <div className="text-base font-medium text-slate-800">{user.username}</div>
                    <div className="text-sm font-medium text-slate-500">{user.role}</div>
                  </div>
                </div>
              )}
              <div className="px-2 space-y-1">
                {/* <NavLink to="/profile" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-200 hover:text-slate-800">Mi Perfil</NavLink> */}
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full text-left flex items-center px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut size={18} className="mr-3" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Contenido Principal de la Página */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">{getPageTitle()}</h1>
        <div className="bg-white shadow-xl rounded-lg p-6 min-h-[calc(100vh-200px)]"> {/* Ajusta min-h según sea necesario */}
          {children}
        </div>
      </main>

      {/* Pie de Página */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} VisualControl por Scanmee. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
