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
const LOGIN_PATH = '/';

function getCurrentRoute() {
    return window.location.pathname + window.location.search + window.location.hash;
}

async function fetchAPI(url, options = {}) {
    const token = sessionStorage.getItem("token");
    
    // Verificación básica de que el token existe antes de enviar la petición
    if (!token) {
        sessionStorage.setItem('redirectAfterLogin', getCurrentRoute());
        window.location.href = LOGIN_PATH;
        return Promise.reject("Token no encontrado");
    }

    // Asegurar que options existe y tiene headers
    options = options || {};
    options.headers = options.headers || {};

    // Añadir el header de autenticación
    options.headers["Authorization"] = `Bearer ${token}`;
    options.headers["Content-Type"] = "application/json";

    try {
        const response = await fetch(url, options);

        // Manejo de errores de autenticación
        if (response.status === 401) {
            logout();
            return Promise.reject("Token inválido o expirado");
        }

        // Intentar parsear la respuesta como JSON
        const data = await response.json();
        return data;

    } catch (error) {
        return Promise.reject("Error en la comunicación con la API");
    }
}

/**
 * Función para cerrar sesión
 * Elimina el token y redirige al usuario a la página de login
 */
function logout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("username");
    if (window.location.pathname !== LOGIN_PATH) {
        sessionStorage.setItem('redirectAfterLogin', getCurrentRoute());// Guardar la última página visitada antes de ser redirigido a login
    } else {
        sessionStorage.removeItem('redirectAfterLogin');
    }
    window.location.href = LOGIN_PATH;
}

/**
 * Verificar si hay un token en sessionStorage al cargar la página
 * Si no hay token y no estamos en `index.html`, redirige a login
 */
document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem("token");
    const isLoginPage = window.location.pathname === LOGIN_PATH;

    if (!token) {
        if (!isLoginPage) {
            sessionStorage.setItem("redirectAfterLogin", getCurrentRoute());
            window.location.href = LOGIN_PATH;
        }
        return;
    }

    if (!isLoginPage) {
        renderUsuarioCabecera(sessionStorage.getItem("username"));
        getUsuario();
    }
});

/**
 * Función para recuperar el usuario activo en la sesión y mostrarlo en la cabecera
 * @returns numbre de usuario
 */
function getUsuario() {
    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.href = LOGIN_PATH;
        return;
    }

    fetchAPI('/api/dashboard/usuario', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
    }).then(data => {
        if (data && data.username) {
            sessionStorage.setItem("username", data.username);
            renderUsuarioCabecera(data.username);
        }
    }).catch(error => console.error("🚨 Error obteniendo el usuario:", error));
}

function renderUsuarioCabecera(username) {
    const userContainer = document.getElementById('div-de-usuario');
    if (!userContainer) return;

    const nombre = String(username ?? "").trim();
    userContainer.textContent = nombre ? nombre : "";
}
