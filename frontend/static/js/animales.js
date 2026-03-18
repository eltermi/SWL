/* Contenido base para animales.js */
let animalModal = null;
let animalForm = null;

document.addEventListener('DOMContentLoaded', function () {
    inicializarModalAnimal();
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

function validarArchivoFotoAnimal(archivo) {
    if (!archivo) return null;
    if (!archivo.type.startsWith("image/")) {
        return "La foto del animal debe ser una imagen válida.";
    }
    return null;
}

function leerArchivoComoDataURL(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
        reader.readAsDataURL(archivo);
    });
}

function calcularEdadDesdeAnioNacimiento(anioNacimiento) {
    const anio = Number(anioNacimiento);
    if (!Number.isInteger(anio) || anio <= 0) return null;
    const anioActual = new Date().getFullYear();
    const edad = anioActual - anio;
    return edad >= 0 ? edad : null;
}

function formatearEdadDesdeAnioNacimiento(anioNacimiento) {
    const edad = calcularEdadDesdeAnioNacimiento(anioNacimiento);
    return edad === null ? "Sin edad" : `${edad} años`;
}

function formatearSexoAnimal(sexo) {
    if (sexo === "M") return "Macho";
    if (sexo === "F") return "Hembra";
    return "Sin especificar";
}

function inicializarModalAnimal() {
    animalModal = document.getElementById("animal-modal");
    animalForm = document.getElementById("animal-form");

    const abrirModalBtn = document.getElementById("abrir-animal-modal");
    abrirModalBtn?.addEventListener("click", () => abrirModalAnimal());

    if (!animalModal) return;

    const closeTriggers = animalModal.querySelectorAll("[data-close-animal-modal]");
    closeTriggers.forEach(trigger => {
        trigger.addEventListener("click", () => cerrarModalAnimal());
    });
}

function abrirModalAnimal() {
    if (!animalModal) return;
    limpiarErrorAnimalFormulario();
    animalForm?.reset();
    animalModal.classList.add("is-active");
    animalModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const primerCampo = animalForm?.querySelector("input, select, textarea");
    if (primerCampo) {
        setTimeout(() => primerCampo.focus(), 50);
    }
}

function cerrarModalAnimal() {
    if (!animalModal) return;
    animalModal.classList.remove("is-active");
    animalModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    limpiarErrorAnimalFormulario();
    animalForm?.reset();
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
                                <p><span class="encabezado">Sexo:</span> ${formatearSexoAnimal(animal.sexo)}</p>
                                <p><span class="encabezado">Edad:</span> ${formatearEdadDesdeAnioNacimiento(animal.edad)}</p>
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
    formData.append("sexo", document.getElementById('form-sexo-animal').value);
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
        cerrarModalAnimal();
        cargarAnimales();
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

    container.style.display = "none";
    muestraAnimal.style.display = "block";

    const nombreAnimal = animal.nombre_animal ?? animal.nombre ?? "Sin nombre";
    const nombreCliente = [animal.nombre_cliente, animal.apellidos_cliente]
        .filter(part => part && part.trim().length > 0)
        .join(" ");
    const tipo = animal.tipo_animal ?? "Sin tipo";
    const sexo = formatearSexoAnimal(animal.sexo);
    const edad = formatearEdadDesdeAnioNacimiento(animal.edad);
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
                    <button type="button" class="btn-principal" id="btn-modificar-animal">Modificar</button>
                    <button type="button" class="btn-peligro" id="btn-eliminar-animal">Eliminar</button>
                </div>
            </div>
            <div class="animal-detalle-body">
                <div>
                    <p><span class="cliente-label">Tipo</span>${tipo}</p>
                    <p><span class="cliente-label">Sexo</span>${sexo}</p>
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

    document.getElementById("btn-volver-animales").addEventListener("click", () => volverAlListadoAnimales(true));
    document.getElementById("btn-modificar-animal").addEventListener("click", () => mostrarFormularioEdicionAnimalDetalle(animal));
    document.getElementById("btn-eliminar-animal").addEventListener("click", () => confirmarEliminacionAnimal(animal.id_animal));
}

function mostrarFormularioEdicionAnimalDetalle(animal) {
    if (!animal) return;
    const muestraAnimal = document.getElementById("muestra-animal");
    const nombreAnimal = animal.nombre_animal ?? animal.nombre ?? "";
    const tipoAnimal = animal.tipo_animal ?? "";
    const sexoAnimal = animal.sexo ?? "";
    const anioNacimiento = animal.edad ?? "";
    const medicacion = animal.medicacion ?? "";
    const fotoActualHTML = animal.foto
        ? `
            <div class="cliente-whatsapp-avatar-preview">
                <img src="${animal.foto}" alt="Foto actual de ${escaparHTML(nombreAnimal)}">
            </div>
        `
        : `<p class="cliente-empty">Sin foto cargada.</p>`;

    muestraAnimal.innerHTML = `
        <div class="animal-detalle-card">
            <div class="animal-detalle-header">
                <div>
                    <p class="animal-detalle-nombre">Modificar animal</p>
                    <p class="animal-detalle-cliente">${nombreAnimal}</p>
                </div>
            </div>
            <form id="form-editar-animal-detalle" class="cliente-edit-form" novalidate>
                <div id="form-editar-animal-error" class="modal-error" role="alert" aria-live="assertive" hidden></div>
                <div class="form-columns">
                    <div class="form-column">
                        <label for="edit_animal_nombre">Nombre</label>
                        <input type="text" id="edit_animal_nombre" value="${escaparHTML(nombreAnimal)}" required>
                        <label for="edit_animal_tipo">Tipo</label>
                        <input type="text" id="edit_animal_tipo" value="${escaparHTML(tipoAnimal)}">
                        <label for="edit_animal_sexo">Sexo</label>
                        <select id="edit_animal_sexo">
                            <option value="" ${!sexoAnimal ? "selected" : ""}>Sin especificar</option>
                            <option value="M" ${sexoAnimal === "M" ? "selected" : ""}>M</option>
                            <option value="F" ${sexoAnimal === "F" ? "selected" : ""}>F</option>
                        </select>
                    </div>
                    <div class="form-column">
                        <label for="edit_animal_edad">Año de nacimiento (opcional)</label>
                        <input type="number" id="edit_animal_edad" min="1900" max="2999" step="1" value="${escaparHTML(String(anioNacimiento))}" placeholder="Ej: 2019">
                        <label for="edit_animal_medicacion">Medicación</label>
                        <input type="text" id="edit_animal_medicacion" value="${escaparHTML(medicacion)}">
                        <label for="edit_animal_foto">Foto</label>
                        <input type="file" id="edit_animal_foto" accept="image/*">
                        ${fotoActualHTML}
                        <label class="cliente-edit-checkbox">
                            <input type="checkbox" id="edit_animal_eliminar_foto">
                            Eliminar foto actual
                        </label>
                    </div>
                </div>
                <div class="cliente-edit-actions">
                    <button type="button" class="btn-secundario" id="cancelar-edicion-animal">Cancelar</button>
                    <button type="submit" class="btn-principal">Guardar cambios</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById("cancelar-edicion-animal")?.addEventListener("click", () => obtenerDetallesAnimal(animal));
    document.getElementById("form-editar-animal-detalle")?.addEventListener("submit", event => {
        guardarCambiosAnimalDesdeDetalle(event, animal);
    });
    const fotoInput = document.getElementById("edit_animal_foto");
    const eliminarFotoInput = document.getElementById("edit_animal_eliminar_foto");
    if (fotoInput && eliminarFotoInput) {
        fotoInput.addEventListener("change", () => {
            if (fotoInput.files?.length) {
                eliminarFotoInput.checked = false;
            }
        });
        eliminarFotoInput.addEventListener("change", () => {
            if (eliminarFotoInput.checked) {
                fotoInput.value = "";
            }
        });
    }
}

function mostrarErrorEdicionAnimalDetalle(mensaje) {
    const errorBox = document.getElementById("form-editar-animal-error");
    if (!errorBox) return;
    errorBox.textContent = mensaje;
    errorBox.hidden = false;
}

function limpiarErrorEdicionAnimalDetalle() {
    const errorBox = document.getElementById("form-editar-animal-error");
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.hidden = true;
}

function escaparHTML(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function guardarCambiosAnimalDesdeDetalle(event, animalOriginal) {
    event.preventDefault();
    limpiarErrorEdicionAnimalDetalle();
    const nombre = document.getElementById("edit_animal_nombre")?.value.trim() ?? "";

    if (!nombre) {
        mostrarErrorEdicionAnimalDetalle("El nombre del animal es obligatorio.");
        return;
    }

    const tipoAnimal = document.getElementById("edit_animal_tipo")?.value.trim() ?? "";
    const sexoAnimal = document.getElementById("edit_animal_sexo")?.value ?? "";
    const edad = document.getElementById("edit_animal_edad")?.value.trim() ?? "";
    const medicacion = document.getElementById("edit_animal_medicacion")?.value.trim() ?? "";
    const fotoArchivo = document.getElementById("edit_animal_foto")?.files?.[0] ?? null;
    const eliminarFoto = Boolean(document.getElementById("edit_animal_eliminar_foto")?.checked);
    const errorFoto = validarArchivoFotoAnimal(fotoArchivo);
    if (errorFoto) {
        mostrarErrorEdicionAnimalDetalle(errorFoto);
        return;
    }

    const formData = new FormData();
    formData.append("nombre", nombre);
    formData.append("tipo_animal", tipoAnimal);
    formData.append("sexo", sexoAnimal);
    formData.append("edad", edad);
    formData.append("medicacion", medicacion);
    formData.append("eliminar_foto", eliminarFoto ? "true" : "false");
    if (fotoArchivo && !eliminarFoto) {
        formData.append("foto", fotoArchivo);
    }

    fetch(`/api/animales/${animalOriginal.id_animal}`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: formData
    })
        .then(async response => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.mensaje || data?.message || "No se pudo actualizar el animal.");
            }
            return data;
        })
        .then(async () => {
            let fotoActualizada = animalOriginal.foto ?? null;
            if (eliminarFoto) {
                fotoActualizada = null;
            } else if (fotoArchivo) {
                fotoActualizada = await leerArchivoComoDataURL(fotoArchivo);
            }

            const animalActualizado = {
                ...animalOriginal,
                nombre_animal: nombre,
                nombre: nombre,
                tipo_animal: tipoAnimal,
                sexo: sexoAnimal || null,
                edad: edad === "" ? null : Number(edad),
                medicacion: medicacion,
                foto: fotoActualizada
            };
            obtenerDetallesAnimal(animalActualizado);
            cargarAnimales(document.getElementById("buscar")?.value ?? "");
        })
        .catch(error => {
            console.error("🚨 Error al actualizar el animal:", error);
            mostrarErrorEdicionAnimalDetalle(error?.message || "No se pudo actualizar el animal.");
        });
}

function volverAlListadoAnimales(recargar = false) {
    const container = document.getElementById("lista-animales");
    const muestraAnimal = document.getElementById("muestra-animal");

    container.style.display = "block";
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
