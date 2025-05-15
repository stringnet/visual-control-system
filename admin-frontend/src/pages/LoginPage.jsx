// admin-frontend/src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react'; // Iconos

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();

  const from = location.state?.from?.pathname || '/dashboard'; // A dónde redirigir después del login

  // Si el usuario ya está autenticado, redirigirlo.
  // Esto es útil si navega a /login manualmente estando ya logueado.
  useEffect(() => {
    if (isAuthenticated) {
      // Asegurarse que el rol es admin antes de redirigir al dashboard
      if (user && user.role === 'admin') {
        navigate(from, { replace: true });
      } else if (user) {
        // Si está autenticado pero no es admin (ej. un 'viewer' intentando acceder al panel de admin)
        setError('Acceso denegado. Esta área es solo para administradores.');
        // Considera desloguearlo o redirigirlo a una página de 'no autorizado' si tienes roles más complejos.
      }
    }
  }, [isAuthenticated, user, navigate, from]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username || !password) {
      setError('Por favor, ingresa tu nombre de usuario y contraseña.');
      setIsLoading(false);
      return;
    }

    try {
      const loginSuccessful = await login(username, password);
      if (loginSuccessful) {
        // El AuthContext ahora tiene el usuario, verificamos si es admin
        // Esta verificación es una doble capa, el backend ya debería validar
        // que solo los admins puedan obtener un token para este panel.
        // La redirección principal se maneja en el useEffect de arriba
        // o por el ProtectedRoute.
        // Aquí solo nos aseguramos de que la lógica de login del AuthContext se complete.
      }
    } catch (err) {
      // El error ya se maneja en AuthContext, pero podemos mostrar un mensaje genérico
      // o uno más específico si el backend lo proporciona bien estructurado.
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Error al iniciar sesión. Verifica tus credenciales o inténtalo más tarde.');
      }
      console.error("Error en handleSubmit de LoginPage:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Si ya está autenticado y es admin, no mostrar el formulario de login
  // (el useEffect de arriba ya debería haber redirigido, pero esto es una salvaguarda)
  if (isAuthenticated && user && user.role === 'admin') {
    return <Navigate to={from} replace />;
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 space-y-6 transform transition-all hover:scale-105 duration-300">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-800">Panel de Administrador</h1>
          <p className="text-slate-500 mt-2">Inicia sesión para continuar</p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-center" role="alert">
            <AlertCircle size={20} className="mr-3 text-red-500" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="username" 
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Nombre de Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              placeholder="tu_usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-slate-500 hover:text-slate-700"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando Sesión...
                </>
              ) : (
                <>
                  <LogIn size={20} className="mr-2" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </div>
        </form>
        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} VisualControl. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
