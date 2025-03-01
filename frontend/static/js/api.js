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
    
    const token = sessionStorage.getItem("token");
    
    // Verificación básica de que el token existe antes de enviar la petición
    if (!token) {
        window.location.href = "/";
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
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);// Guardar la última página visitada antes de ser redirigido a login
    window.location.href = "/";
}

/**
 * Verificar si hay un token en sessionStorage al cargar la página
 * Si no hay token y no estamos en `index.html`, redirige a login
 */
document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem("token");

    if (!token && !window.location.href.includes("/")) {
        sessionStorage.setItem("redirectAfterLogin", window.location.pathname);
        window.location.href = "/";
    }else if(token){
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
        window.location.href = "/";
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
            document.getElementById('div-de-usuario').innerHTML = `<p>${data.username}</p>`;
        } else {
        }
    }).catch(error => console.error("🚨 Error obteniendo el usuario:", error));
}
