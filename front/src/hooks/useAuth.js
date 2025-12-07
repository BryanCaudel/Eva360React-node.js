import { useState, useCallback } from "react";
import { login as apiLogin, setAuthToken, clearAuthToken, getAuthToken } from "../api";

// Estado global del usuario (en memoria)
let globalUser = null;

export default function useAuth() {
  const [user, setUser] = useState(globalUser);
  const [loading, setLoading] = useState(false);

  // Login usando el endpoint real del backend
  const login = useCallback(async (username, password) => {
    if (!username || !password) {
      return { ok: false, error: "Usuario y contraseña son requeridos" };
    }

    setLoading(true);
    try {
      const response = await apiLogin(username.trim(), password);
      
      if (response.token) {
        // Guardar token en api.js y usuario en el hook
        setAuthToken(response.token);
        globalUser = { name: username, role: "admin" };
        setUser(globalUser);
        
        return { ok: true, token: response.token };
      } else {
        return { ok: false, error: "No se recibió token de autenticación" };
      }
    } catch (error) {
      const errorMessage = error.message || "Error al iniciar sesión";
      return { ok: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout: limpia el token y el usuario
  const logout = useCallback(() => {
    clearAuthToken();
    globalUser = null;
    setUser(null);
  }, []);

  // Verificar si el usuario está autenticado
  const token = getAuthToken();
  const isAuthenticated = user !== null && token !== null;

  return { 
    user, 
    token,
    loading,
    login, 
    logout,
    isAuthenticated
  };
}
