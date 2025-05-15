// admin-frontend/src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api'; // Crearemos este archivo a continuación

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Información del usuario (id, username, role)
    const [token, setToken] = useState(localStorage.getItem('authToken'));
    const [loading, setLoading] = useState(true); // Para saber si estamos verificando el token inicial

    useEffect(() => {
        const currentToken = localStorage.getItem('authToken');
        if (currentToken) {
            setToken(currentToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
            // Opcional: Verificar el token con el backend y obtener datos del usuario
            api.get('/auth/me') // Asumiendo que tienes esta ruta en tu backend
                .then(response => {
                    setUser(response.data);
                })
                .catch(() => {
                    // Token inválido o expirado
                    localStorage.removeItem('authToken');
                    setToken(null);
                    setUser(null);
                    delete api.defaults.headers.common['Authorization'];
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });
            const { token: newToken, ...userData } = response.data;
            
            localStorage.setItem('authToken', newToken);
            setToken(newToken);
            setUser(userData); // Guardamos _id, username, role
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            return true; // Login exitoso
        } catch (error) {
            console.error("Error en el login:", error.response ? error.response.data : error.message);
            // Aquí podrías manejar el error, por ejemplo, mostrando un mensaje al usuario
            throw error; // Relanzar el error para que el componente de login lo maneje
        }
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
        delete api.defaults.headers.common['Authorization'];
        // No es necesario redirigir aquí, el componente ProtectedRoute se encargará
    };

    // Solo renderizar hijos cuando la carga inicial del token haya terminado
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="p-6 bg-white shadow-md rounded-lg">
                    Cargando autenticación...
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!token, user, token, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
