/* Contenido base para animales.js */
document.addEventListener('DOMContentLoaded', function () {
    cargarAnimales();
    cargarClientesEnFormulario();
    document.getElementById('animal-form').addEventListener('submit', agregarAnimal);
    document.getElementById('animal-form').addEventListener('input', limpiarErrorAnimalFormulario);
    document.getElementById('buscar').addEventListener('input', buscarAnimales);
    enfocarBuscadorAnimales();
});

function enfocarBuscadorAnimales() {
    const buscador = document.getElementById('buscar');
    if (!buscador) return;
    requestAnimationFrame(() => buscador.focus());
}

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
    }).then(async response => {
        let data = {};
        try {
            data = await response.json();
        } catch (_) {
            data = {};
        }

        if (!response.ok) {
            throw new Error(data?.mensaje || data?.message || "Error en la API.");
        }
        return data;
    });
}

function limpiarErrorAnimalFormulario() {
    const errorBox = document.getElementById("form-animal-error-general");
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.hidden = true;
}

function mostrarErrorAnimalFormulario(mensaje) {
    const errorBox = document.getElementById("form-animal-error-general");
    if (!errorBox) return;
    errorBox.textContent = mensaje;
    errorBox.hidden = false;
}

function cargarAnimales(busqueda = "") {
    const container = document.getElementById("lista-animales");
    const muestraAnimal = document.getElementById("muestra-animal");

    container.innerHTML = "";
    muestraAnimal.innerHTML = "";
    muestraAnimal.style.display = "none";
    container.style.display = "block";

    fetchAPI(`/api/animales?buscar=${busqueda}`)
        .then(animales => {
            const animalesPorCliente = {};

            animales.forEach(animal => {
                const idCliente = animal.id_cliente;

                if (!animalesPorCliente[idCliente]) {
                    animalesPorCliente[idCliente] = {
                        nombre: animal.nombre_cliente,
                        apellidos: animal.apellidos_cliente,
                        animales: []
                    };
                }

                animalesPorCliente[idCliente].animales.push(animal);
            });

            Object.values(animalesPorCliente).forEach(grupo => {
                // Ordenar animales por ID
                grupo.animales.sort((a, b) => a.id_animal - b.id_animal);

                const clienteHeader = document.createElement("h3");
                clienteHeader.textContent = `${grupo.nombre} ${grupo.apellidos ?? ""}`;
                container.appendChild(clienteHeader);

                grupo.animales.forEach(animal => {
                    const animalDiv = document.createElement("div");
                    animalDiv.classList.add("animal");
                    animalDiv.setAttribute("data-id", animal.id_animal);
                    animalDiv.addEventListener("click", () => {
                        obtenerDetallesAnimal(animal);
                    });

                    animalDiv.innerHTML = `
                        <div class="animal-content">
                            <div class="detalles">
                                <p><span class="nombreAnimal">${animal.nombre_animal}</span></p>
                                <p><span class="encabezado">Edad:</span> ${animal.edad}</p>
                                <p><span class="encabezado">Medicación:</span> ${animal.medicacion ?? "No hay medicación"}</p>
                            </div>
                            <div class="contrato-foto">
                                ${animal.foto ? `<img src="${animal.foto}" alt="Foto de ${animal.nombre}">` : "No hay foto disponible"}
                            </div>
                        </div>
                    `;
                    container.appendChild(animalDiv);
                });
            });
        })
        .catch(error => console.error("🚨 Error cargando animales:", error));
}

function cargarClientesEnFormulario() {
    fetchAPI('/api/clientes')
        .then(clientes => {
            const select = document.getElementById('form-nombre-cliente');
            select.innerHTML = '<option value="">Selecciona un cliente</option>';
            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id_cliente;
                option.textContent = `${cliente.nombre}${cliente.apellidos ? " " + cliente.apellidos : ""}`;
                select.appendChild(option);
            });
        })
        .catch(error => console.error("🚨 Error cargando clientes para el formulario:", error));
}

function agregarAnimal(event) {
    event.preventDefault();
    limpiarErrorAnimalFormulario();
    const formData = new FormData();
    formData.append("nombre", document.getElementById('form-nombre-animal').value);
    formData.append("id_cliente", document.getElementById('form-nombre-cliente').value);
    formData.append("tipo_animal", document.getElementById('form-tipo-animal').value);
    formData.append("edad", document.getElementById('form-edad').value);
    formData.append("medicacion", document.getElementById('form-medicacion').value);
    const fotoInput = document.getElementById("form-foto");
    if (fotoInput.files.length > 0) {
        formData.append("foto", fotoInput.files[0]);
    }
    fetch("/api/animales", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: formData
    }).then(async response => {
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.mensaje || errorData?.message || "No se pudo crear el animal.");
        }
        return response.json().catch(() => ({}));
    }).then(() => {
        cargarAnimales();
        document.getElementById('animal-form').reset();
    }).catch(error => {
        console.error("🚨 Error al agregar animal:", error);
        mostrarErrorAnimalFormulario(error?.message || "No se pudo crear el animal.");
    });
}

function agregarAnimal1(event) {
    event.preventDefault();
    const nombre = document.getElementById('form-nombre-animal').value;
    const id_cliente = document.getElementById('form-nombre-cliente').value;
    const tipo_animal = document.getElementById('form-tipo_animal').value;
    const edad = document.getElementById('form-edad').value;
    const medicacion = document.getElementById('form-medicacion').value;
    const foto = document.getElementById('form-foto').value;

    fetchAPI('/api/animales', {
        method: 'POST',
        body: JSON.stringify({ nombre, id_cliente, tipo_animal, edad, medicacion, foto})
    }).then(() => {
        cargarAnimales();
        document.getElementById('animal-form').reset();
    }); 
}

function eliminarAnimal(id) {
    return fetchAPI(`/api/animales/${id}`, { method: 'DELETE' })
        .then(() => cargarAnimales());
}

function editarAnimal(id) {
    const nuevoEdad = prompt("Nueva edad:");
    const nuevoMedicacion = prompt("Nueva medicación:");

    if (nuevoEdad && nuevoMedicacion) {
        fetchAPI(`/api/animales/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ edad: nuevoEdad, medicacion: nuevoMedicacion })
        }).then(() => cargarAnimales())
            .catch(error => {
                console.error("🚨 Error al actualizar el animal:", error);
                mostrarErrorAnimalFormulario(error?.message || "No se pudo actualizar el animal.");
            });
    }
}

function buscarAnimales(event) {
    const filtro = event.target.value;
    cargarAnimales(filtro);
}

function obtenerDetallesAnimal(animal) {
    if (!animal) return;

    const container = document.getElementById("lista-animales");
    const muestraAnimal = document.getElementById("muestra-animal");
    const formulario = document.getElementById("form-crea-animal");

    container.style.display = "none";
    formulario.style.display = "none";
    muestraAnimal.style.display = "block";

    const nombreAnimal = animal.nombre_animal ?? animal.nombre ?? "Sin nombre";
    const nombreCliente = [animal.nombre_cliente, animal.apellidos_cliente]
        .filter(part => part && part.trim().length > 0)
        .join(" ");
    const tipo = animal.tipo_animal ?? "Sin tipo";
    const edad = animal.edad ?? "Sin edad";
    const medicacion = animal.medicacion ?? "No hay medicación";
    const fotoHTML = animal.foto
        ? `<img src="${animal.foto}" alt="Foto de ${nombreAnimal}">`
        : `<div class="animal-detalle-foto-placeholder">Sin foto disponible</div>`;

    muestraAnimal.innerHTML = `
        <div class="animal-detalle-card">
            <div class="animal-detalle-header">
                <div>
                    <p class="animal-detalle-nombre">${nombreAnimal}</p>
                    ${nombreCliente ? `<p class="animal-detalle-cliente">${nombreCliente}</p>` : ""}
                </div>
                <div class="animal-detalle-actions">
                    <button type="button" class="btn-secundario" id="btn-volver-animales">Volver</button>
                    <button type="button" class="btn-peligro" id="btn-eliminar-animal">Eliminar</button>
                </div>
            </div>
            <div class="animal-detalle-body">
                <div>
                    <p><span class="cliente-label">Tipo</span>${tipo}</p>
                    <p><span class="cliente-label">Edad</span>${edad}</p>
                    <p><span class="cliente-label">Medicación</span>${medicacion}</p>
                    <p><span class="cliente-label">Cliente</span>${nombreCliente || "-"}</p>
                    <p><span class="cliente-label">ID cliente</span>${animal.id_cliente ?? "-"}</p>
                </div>
                <div class="animal-detalle-foto">
                    ${fotoHTML}
                </div>
            </div>
        </div>
    `;

    document.getElementById("btn-volver-animales").addEventListener("click", () => volverAlListadoAnimales());
    document.getElementById("btn-eliminar-animal").addEventListener("click", () => confirmarEliminacionAnimal(animal.id_animal));
}

function volverAlListadoAnimales(recargar = false) {
    const container = document.getElementById("lista-animales");
    const muestraAnimal = document.getElementById("muestra-animal");
    const formulario = document.getElementById("form-crea-animal");

    container.style.display = "block";
    formulario.style.display = "block";
    muestraAnimal.style.display = "none";
    muestraAnimal.innerHTML = "";

    if (recargar) {
        cargarAnimales();
    }
}

function confirmarEliminacionAnimal(idAnimal) {
    if (!idAnimal) return;
    const confirmar = window.confirm("¿Seguro que quieres eliminar este animal? Esta acción no se puede deshacer.");
    if (!confirmar) return;

    eliminarAnimal(idAnimal)
        .then(() => volverAlListadoAnimales())
        .catch(error => console.error("🚨 Error al eliminar el animal:", error));
}
