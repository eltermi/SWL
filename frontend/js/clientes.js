/* Contenido base para clientes.js */
document.addEventListener('DOMContentLoaded', function () {
    cargarClientes();
    document.getElementById('cliente-form').addEventListener('submit', agregarCliente);
    document.getElementById('buscar').addEventListener('input', buscarClientes);
});

function fetchAPI(url, options = {}) {
    const token = sessionStorage.getItem("token");
    if (!token) {
        console.warn("⚠️ No hay token. Redirigiendo a login.");
        window.location.href = "index.html";
        return Promise.reject("No hay token");
    }

    return fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    }).then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.message); });
        }
        return response.json();
    }).catch(error => console.error("Error en la API:", error));
}


function cargarClientes(busqueda = "") {
    fetchAPI(`/clientes?buscar=${busqueda}`)
        .then(clientes => {
            console.log("📡 Clientes recibidos:", clientes); // Debug

            if (!Array.isArray(clientes)) {
                console.error("❌ La API no devolvió un array de clientes:", clientes);
                return;
            }

            const lista = document.getElementById("clientes-list");
            lista.innerHTML = "";

            clientes.forEach(cliente => {
                const li = document.createElement("li");
                li.textContent = `${cliente.nombre} ${cliente.apellidos} - ${cliente.email}`;
                lista.appendChild(li);
            });
        })
        .catch(error => {
            console.error("🚨 Error cargando clientes:", error);
        });
}

function agregarCliente(event) {
    event.preventDefault();
    const nombre = document.getElementById('nombre').value;
    const apellidos = document.getElementById('apellidos').value;
    const email = document.getElementById('email').value;

    fetchAPI('/clientes', {
        method: 'POST',
        body: JSON.stringify({ nombre, apellidos, email })
    }).then(() => {
        cargarClientes();
        document.getElementById('cliente-form').reset();
    });
}

function eliminarCliente(id) {
    fetchAPI(`/clientes/${id}`, { method: 'DELETE' })
        .then(() => cargarClientes());
}

function editarCliente(id) {
    const nuevoNombre = prompt("Nuevo nombre:");
    const nuevoApellidos = prompt("Nuevos apellidos:");
    const nuevoEmail = prompt("Nuevo correo electrónico:");

    if (nuevoNombre && nuevoApellidos && nuevoEmail) {
        fetchAPI(`/clientes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ nombre: nuevoNombre, apellidos: nuevoApellidos, email: nuevoEmail })
        }).then(() => cargarClientes());
    }
}

function buscarClientes(event) {
    const filtro = event.target.value;
    cargarClientes(filtro);
}