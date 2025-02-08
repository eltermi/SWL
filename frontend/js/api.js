function fetchAPI(url, options = {}) {
    console.log(`📡 fetchAPI ejecutado para: ${url}`);

    const token = sessionStorage.getItem("token");
    console.log(`🔑 Token en sessionStorage:`, token);

    if (!options) options = {};
    if (!options.headers) options.headers = {};

    options.headers["Content-Type"] = "application/json";

    if (token) {
        options.headers["Authorization"] = `Bearer ${token}`;
        console.log(`✅ Token añadido a los headers:`, options.headers);
    } else {
        console.warn("⚠️ No hay token en sessionStorage. Redirigiendo a login.");
        window.location.href = "index.html";
        return Promise.reject("Token no encontrado");
    }

    console.log(`🚀 Enviando petición con headers:`, options);

    return fetch(url, options)
        .then(async res => {
            console.log(`📡 Respuesta recibida desde ${url}:`, res.status);

            if (res.status === 401) {
                console.error("❌ Error 401: Token inválido o expirado.");
                logout();
                return Promise.reject("Token inválido o expirado");
            }

            try {
                const data = await res.json();
                console.log(`📡 Datos recibidos de ${url}:`, data);
                return data;
            } catch (error) {
                console.error("🚨 Error parseando JSON:", error);
                return Promise.reject("Error en la respuesta JSON");
            }
        })
        .catch(error => console.error("🚨 Error en la API:", error));
}



/* Redirigir si no hay token en las páginas protegidas */
document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem("token");
    console.log(`🔍 Verificando token en carga de página: ${token ? "Presente" : "No encontrado"}`);

    if (!token && !window.location.href.includes("index.html")) {
        window.location.href = "index.html";
    }    
});
