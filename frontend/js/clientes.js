/* Contenido base para clientes.js */
document.addEventListener('DOMContentLoaded', function () {
    cargarClientes();
    document.getElementById('cliente-form').addEventListener('submit', agregarCliente);
    document.getElementById('buscar').addEventListener('input', buscarClientes);
});

function fetchAPI(url, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.message); });
        }
        return response.json();
    }).catch(error => console.error("Error en la API:", error));
}

function cargarClientes(filtro = "") {
    fetchAPI(`/clientes?buscar=${filtro}`)
        .then(clientes => {
            const lista = document.getElementById('clientes-list');
            lista.innerHTML = '';
            clientes.forEach(cliente => {
                const item = document.createElement('li');
                item.innerHTML = `
                    ${cliente.nombre} ${cliente.apellidos} - ${cliente.email} 
                    <button onclick="editarCliente(${cliente.id_cliente})">Editar</button>
                    <button onclick="eliminarCliente(${cliente.id_cliente})">Eliminar</button>
                `;
                lista.appendChild(item);
            });
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