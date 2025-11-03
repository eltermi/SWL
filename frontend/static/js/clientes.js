/* Contenido base para clientes.js */
document.addEventListener('DOMContentLoaded', function () {
    cargarClientes();
    document.getElementById('cliente-form').addEventListener('submit', agregarCliente);
    document.getElementById('buscar').addEventListener('input', buscarClientes);
});

function fetchAPI(url, options = {}) {
    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.href = "/";
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
    const container = document.getElementById("lista-clientes");
    const muestraCliente = document.getElementById("muestra-cliente");

    container.innerHTML = "";
    muestraCliente.innerHTML = "";
    muestraCliente.style.display = "none";
    document.getElementById("form-crea-cliente").style.display = "block";
    container.style.display = "block";

    fetchAPI(`/api/clientes?buscar=${busqueda}`)
        .then(clientes => {
            clientes.forEach(cliente => {
                const clienteDiv = document.createElement("div");
                clienteDiv.classList.add("cliente");
                clienteDiv.setAttribute("data-id", cliente.id_cliente);
                clienteDiv.addEventListener("click", () => {
                    obtenerDetallesCliente(cliente.id_cliente);
                });

                clienteDiv.innerHTML = `
                    <div class="cliente-content">
                        <div class="detalles">
                            <p class="nombreCliente">${cliente.nombre}${cliente.apellidos ? " " + cliente.apellidos : ""}</p>
                            <p>${cliente.calle}</p>
                            <p>L-${cliente.codigo_postal}, ${cliente.municipio}</p>
                            <p>${cliente.telefono}</p>
                        </div>
                        <div class="detalles">
                            <p class="nombreAnimal">${cliente.gatos ?? ""}</p>
                            <p>&nbsp;</p>
                            <p>&nbsp;</p>
                            <p>&nbsp;</p>
                        </div>
                    </div>
                `;
                container.appendChild(clienteDiv);
            });
        })
        .catch(error => console.error("\uD83D\uDEA8 Error cargando clientes:", error));
}
function obtenerDetallesCliente(id_cliente) {
    fetchAPI(`/api/clientes/${id_cliente}`)
        .then(cliente => {
            const container = document.getElementById("lista-clientes");
            const muestraCliente = document.getElementById("muestra-cliente");

            container.style.display = "none";
            muestraCliente.style.display = "block";
            document.getElementById("form-crea-cliente").style.display = "none";

            let contenidoHTML = `
                <div class="cliente">
                    <div class="cliente-content">
                        <div class="detalles">
                            <p class="encabezado">${cliente.nombre}${cliente.apellidos ? " " + cliente.apellidos : ""}</p>
                            <p>${cliente.telefono}</p>
                            ${cliente.ad_nombre ? `<p class="encabezado">${cliente.ad_nombre} ${cliente.ad_apellidos ? cliente.ad_apellidos : ''}</p>` : ''}
                            ${cliente.ad_nombre ? `<p class="telefono">${cliente.ad_telefono}</p>` : ''}
                            <p class="encabezado">Dirección</p>
                            <p>${cliente.calle} ${cliente.piso ? ". " + cliente.piso : ""}</p>
                            <p>L-${cliente.codigo_postal} ${cliente.municipio}</p>
                            <p>${cliente.pais}</p>
                            ${cliente.email ? `<p class="encabezado">email</p> <p>${cliente.email}` : '<p>&nbsp;</p>'}
                            ${!cliente.ad_nombre ? "<p>&nbsp;</p>" : ""}
                            ${!cliente.ad_nombre ? "<p>&nbsp;</p>" : ""}
                        </div>
                        <div class="detalles">
                            <p class="encabezado">Nacionalidad</p>
                            <p>${cliente.nacionalidad}</p>
                            <p class="encabezado">Idioma(s) de contacto</p>
                            <p>${cliente.idioma}</p>
                            <p class="encabezado">Género</p>
                            <p>${cliente.genero}</p>
                            <p class="encabezado">Referencia</p>
                            <p>${cliente.referencia ?? "N/A"}</p>
                            <p class="encabezado"></p>
                        </div>
                    </div>
                </div>
            `;

            return fetchAPI(`/api/animales/cliente/${id_cliente}`)
                .then(animales => {
                    contenidoHTML += `<div class="cliente"><div class="animales-wrapper">`;

                    if (animales.length > 0) {
                        animales.forEach(animal => {
                            contenidoHTML += `
                                <div class="animal">
                                    <div class="detalles">
                                        <p class="animales">${animal.nombre_animal}</p>
                                        <p>${animal.tipo_animal}</p>
                                        <p>${animal.edad}</p>
                                        <p>${animal.medicacion ?? "No hay medicación"}</p>
                                    </div>
                                    <div class="contrato-foto">
                                        ${animal.foto ? `<img src="${animal.foto}" alt="Foto de ${animal.nombre_animal}">` : "<div class='no-foto'>No hay foto disponible</div>"}
                                    </div>
                                </div>
                            `;
                        });
                    }

                    contenidoHTML += `</div></div>`;
                    contenidoHTML += `<button class="centrar" onclick="cargarClientes()">Volver a clientes</button>`;
                    contenidoHTML += `<button class="centrar" onclick="mostrarFormularioContrato(${id_cliente})">Nuevo contrato</button>`;
                    muestraCliente.innerHTML = contenidoHTML;
                });
        })
        .catch(error => console.error("🚨 Error al obtener detalles del cliente:", error));
}

function agregarCliente(event) {
    event.preventDefault();
    const nombre = document.getElementById('nombre').value;
    const apellidos = document.getElementById('apellidos').value;
    const calle = document.getElementById('calle').value;
    const piso = document.getElementById('piso').value;
    const codigo_postal = document.getElementById('codigo_postal').value;
    const municipio = document.getElementById('municipio').value;
    const pais = document.getElementById('pais').value;
    const telefono = document.getElementById('telefono').value;
    const email = document.getElementById('email').value;
    const nacionalidad = document.getElementById('nacionalidad').value;
    const idioma = document.getElementById('idioma').value;
    const genero = document.getElementById('genero').value;
    const referencia_origen = document.getElementById('referencia_origen').value;

    fetchAPI('/api/clientes', {
        method: 'POST',
        body: JSON.stringify({ nombre, apellidos, calle, piso, codigo_postal, municipio, pais, telefono, email, nacionalidad, idioma, genero, referencia_origen })
    }).then(() => {
        cargarClientes();
        document.getElementById('cliente-form').reset();
    });
}

function eliminarCliente(id) {
    fetchAPI(`/api/clientes/${id}`, { method: 'DELETE' })
        .then(() => cargarClientes());
}

function editarCliente(id) {
    const nuevoNombre = prompt("Nuevo nombre:");
    const nuevoApellidos = prompt("Nuevos apellidos:");
    const nuevoEmail = prompt("Nuevo correo electrónico:");

    if (nuevoNombre && nuevoApellidos && nuevoEmail) {
        fetchAPI(`/api/clientes/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ nombre: nuevoNombre, apellidos: nuevoApellidos, email: nuevoEmail })
        }).then(() => cargarClientes());
    }
}

function buscarClientes(event) {
    const filtro = event.target.value;
    cargarClientes(filtro);
}

function mostrarFormularioContrato(idCliente) {
    const muestraCliente = document.getElementById("muestra-cliente");
    const formularioHTML = `
        <div id="form-crea-cliente">
            <form id="form-contrato">
                <input type="date" class="formulario-input" id="fecha_inicio" required placeholder="Fecha de inicio">
                <input type="date" class="formulario-input" id="fecha_fin" required placeholder="Fecha de fin">
                <input type="text" class="formulario-input" id="numero_visitas_diarias" placeholder="Número de visitas diarias">
                <input type="time" class="formulario-input" id="hora_manana" placeholder="Hora de la mañana">
                <input type="time" class="formulario-input" id="hora_tarde" placeholder="Hora de la tarde">
                <input type="text" class="formulario-input" id="pago_adelantado" placeholder="Pago adelantado (€)">
                <select id="estado_pago_adelantado" class="formulario-input">
                    <option value="Pagado">Pagado</option>
                    <option value="Pendiente" selected>Pendiente</option>
                </select>
                <input type="text" class="formulario-input" id="pago_final" placeholder="Pago final (€)">
                <select id="estado_pago_final" class="formulario-input">
                    <option value="Pagado">Pagado</option>
                    <option value="Pendiente" selected>Pendiente</option>
                </select>
                <input type="text" class="formulario-input" id="observaciones" placeholder="Observaciones">
                <button type="submit">Guardar contrato</button>
            </form>
        </div>
    `;
    muestraCliente.insertAdjacentHTML("beforeend", formularioHTML);

    document.getElementById("form-contrato").addEventListener("submit", function (e) {
        e.preventDefault();
        const fecha_inicio = document.getElementById("fecha_inicio").value;
        const fecha_fin = document.getElementById("fecha_fin").value;
        const numero_visitas_diarias = document.getElementById("numero_visitas_diarias").value;
        const hora_manana = document.getElementById("hora_manana").value;
        const hora_tarde = document.getElementById("hora_tarde").value;
        const pago_adelantado = document.getElementById("pago_adelantado").value;
        const estado_pago_adelantado = document.getElementById("estado_pago_adelantado").value;
        const pago_final = document.getElementById("pago_final").value;
        const estado_pago_final = document.getElementById("estado_pago_final").value;
        const observaciones = document.getElementById("observaciones").value;

        const horario_visitas = {};
        if (hora_manana) horario_visitas["Mañana"] = hora_manana;
        if (hora_tarde) horario_visitas["Tarde"] = hora_tarde;

        fetchAPI('/api/contratos', {
            method: 'POST',
            body: JSON.stringify({
                id_cliente: idCliente,
                fecha_inicio,
                fecha_fin,
                numero_visitas_diarias,
                horario_visitas,
                pago_adelantado,
                estado_pago_adelantado,
                pago_final,
                estado_pago_final,
                observaciones
            })
        }).then(() => {
            alert("Contrato creado correctamente");
            cargarClientes();
        });
    });
}