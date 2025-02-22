/* Contenido base para dashboard.js */
document.addEventListener('DOMContentLoaded', function () {
    getUsuario();
});

/*
function fetchAPI(url, options = {}) {

    return fetch(url, {
        ...options
    }).then(response => {
        console.warn(response.json());
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.message); });
        }
        return response.json();
    }).catch(error => console.error("Error en la API:", error));
}*/


function fetchAPI(url, options = {}) {
    return fetch(url, {
        ...options
    }).then(response => {
        return response.json().then(data => {
            console.warn("📡 Respuesta JSON recibida:", data);
            if (!response.ok) {
                throw new Error(data.message || "Error en la API");
            }
            return data;
        });
    }).catch(error => console.error("🚨 Error en la API:", error));
}

/*
function getUsuario() {

    const token = sessionStorage.getItem("token");
    if (!token) {
        console.warn("⚠️ No hay token. Redirigiendo a login.");
        window.location.href = "index.html";
        return Promise.reject("No hay token");
    }

    console.info(JSON.stringify({ token }));

    fetchAPI('/dashboard/usuario', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
    }).then(() => {
        document.getElementById('dashboard-content').innerHTML = `<p>Bienvenido, ${username}</p>`;
    });
}*/

function getUsuario() {
    const token = sessionStorage.getItem("token");
    if (!token) {
        console.warn("⚠️ No hay token. Redirigiendo a login.");
        window.location.href = "index.html";
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
            document.getElementById('dashboard-content').innerHTML = `<p>Bienvenido, ${data.username}</p>`;
        } else {
            console.error("⚠️ No se recibió el nombre de usuario.");
        }
    }).catch(error => console.error("🚨 Error obteniendo el usuario:", error));
}
