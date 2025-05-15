// admin-frontend/src/components/Auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Importa el hook useAuth
// Importaremos AdminLayout más adelante. Por ahora, podemos usar un div simple o un Fragment.
import AdminLayout from '../Layout/AdminLayout'; 

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Si todavía está cargando la información de autenticación, muestra un mensaje o spinner.
  // Esto evita redirecciones prematuras antes de que se verifique el token.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="p-6 bg-white shadow-md rounded-lg">
          Verificando autenticación...
        </div>
      </div>
    );
  }

  // Si el usuario no está autenticado, redirigir a la página de login.
  // Guardamos la ubicación actual para poder redirigir de vuelta después del login si es necesario.
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Opcional: Verificación de roles si 'allowedRoles' está definido
  // Esto es útil si tienes diferentes tipos de usuarios (ej. admin, editor)
  // y algunas rutas solo son para ciertos roles. Para tu caso, el backend ya protege
  // las rutas de admin, pero esto es una capa extra en el frontend.
  if (allowedRoles && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // Si el rol del usuario no está permitido para esta ruta,
    // puedes redirigirlo a una página de "Acceso Denegado" o al dashboard.
    console.warn(`Usuario con rol '${user.role}' intentó acceder a una ruta restringida a roles: ${allowedRoles.join(', ')}`);
    return <Navigate to="/dashboard" state={{ message: "No tienes permiso para acceder a esta página." }} replace />;
    // O podrías tener un componente específico <AccessDeniedPage />
    // return <Navigate to="/access-denied" replace />;
  }

  // Si está autenticado (y si los roles son correctos, si se especificaron),
  // renderiza el componente hijo (la página protegida).
  // Más adelante, envolveremos 'children' con un AdminLayout.
  // Por ahora, solo renderizamos los hijos directamente.
  // return <AdminLayout>{children}</AdminLayout>;
  return <>{children}</>; // Usamos un Fragment por ahora, lo cambiaremos por AdminLayout
};

export default ProtectedRoute;
