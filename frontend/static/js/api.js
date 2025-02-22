/**
 * api.js - Manejo de peticiones con autenticación JWT para Sitters with Love
 * © 2025 Sitters with Love
 */

/**
 * Función para realizar peticiones autenticadas a la API
 * @param {string} url - URL del endpoint (ej: "/clientes")
 * @param {object} options - Opciones de configuración de fetch (ej: método, cuerpo, etc.)
 * @returns {Promise} - Respuesta de la API en JSON
 */
async function fetchAPI(url, options = {}) {
    console.log(`📡 Ejecutando fetchAPI para: ${url}`);

    const token = sessionStorage.getItem("token");
    console.log(`🔑 Token en sessionStorage:`, token);

    // Verificación básica de que el token existe antes de enviar la petición
    if (!token) {
        console.warn("⚠️ No hay token almacenado. Redirigiendo a login.");
        window.location.href = "/";
        return Promise.reject("Token no encontrado");
    }

    // Asegurar que options existe y tiene headers
    options = options || {};
    options.headers = options.headers || {};

    // Añadir el header de autenticación
    options.headers["Authorization"] = `Bearer ${token}`;
    options.headers["Content-Type"] = "application/json";

    console.log(`🚀 Enviando petición con headers:`, options);

    try {
        const response = await fetch(url, options);

        console.log(`📡 Respuesta recibida (${response.status}) desde ${url}`);

        // Manejo de errores de autenticación
        if (response.status === 401) {
            console.error("❌ Error 401: Token inválido o expirado. Cerrando sesión.");
            logout();
            return Promise.reject("Token inválido o expirado");
        }

        // Intentar parsear la respuesta como JSON
        const data = await response.json();
        console.log(`📡 Datos recibidos de ${url}:`, data);
        return data;

    } catch (error) {
        console.error("🚨 Error en la API:", error);
        return Promise.reject("Error en la comunicación con la API");
    }
}

/**
 * Función para cerrar sesión
 * Elimina el token y redirige al usuario a la página de login
 */
function logout() {
    console.log("🔴 Cierre de sesión: eliminando token y redirigiendo.");
    sessionStorage.removeItem("token");
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);// Guardar la última página visitada antes de ser redirigido a login
    window.location.href = "/";
}

/**
 * Verificar si hay un token en sessionStorage al cargar la página
 * Si no hay token y no estamos en `index.html`, redirige a login
 */
document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem("token");
    console.log("🔍 Verificando token en carga de página: " + token);

    if (!token && !window.location.href.includes("/")) {
        console.warn("⚠️ Token no encontrado, redirigiendo a login.");
        sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
        window.location.href = "/";
    }
});
