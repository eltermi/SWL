let contactoModal = null;
let contactoForm = null;
let contactoDetalleActual = null;

function crearLoadingStateHTML({ mensaje, subtitulo = "", skeletons = "" }) {
    return `
        <div class="loading-state" role="status" aria-live="polite">
            <p class="loading-state-message">${mensaje}</p>
            ${subtitulo ? `<p class="loading-state-subtext">${subtitulo}</p>` : ""}
            ${skeletons}
        </div>
    `;
}

function crearContactosSkeletons() {
    return `
        <div class="loading-skeleton-list" aria-hidden="true">
            <div class="loading-skeleton-card">
                <span class="loading-skeleton-line loading-skeleton-line--medium loading-skeleton-line--title"></span>
                <span class="loading-skeleton-line loading-skeleton-line--short"></span>
                <span class="loading-skeleton-line loading-skeleton-line--full"></span>
            </div>
            <div class="loading-skeleton-card">
                <span class="loading-skeleton-line loading-skeleton-line--medium loading-skeleton-line--title"></span>
                <span class="loading-skeleton-line loading-skeleton-line--medium"></span>
                <span class="loading-skeleton-line loading-skeleton-line--long"></span>
            </div>
        </div>
    `;
}

function mostrarLoadingContactos(container) {
    if (!container) return;
    container.setAttribute("aria-busy", "true");
    container.innerHTML = crearLoadingStateHTML({
        mensaje: "Cargando contactos...",
        subtitulo: "Consultando la base de datos y agrupando por cliente.",
        skeletons: crearContactosSkeletons()
    });
}

function escaparHTML(texto = "") {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function fetchAPI(url, options = {}) {
    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.href = "/";
        return Promise.reject(new Error("No hay token"));
    }

    const headers = {
        "Authorization": `Bearer ${token}`,
        ...(options.headers || {})
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    return fetch(url, { ...options, headers }).then(async response => {
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

function obtenerMensajeError(error, fallback = "No se pudo completar la operación.") {
    const mensaje = String(error?.message || "").trim();
    return mensaje || fallback;
}

function limpiarErrorContactoFormulario() {
    const errorBox = document.getElementById("form-contacto-error-general");
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.hidden = true;
}

function mostrarErrorContactoFormulario(mensaje) {
    const errorBox = document.getElementById("form-contacto-error-general");
    if (!errorBox) return;
    errorBox.textContent = mensaje;
    errorBox.hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarModalContacto();
    cargarContactos();
    cargarClientesEnFormulario("form-cliente-contacto");
    document.getElementById("buscar")?.addEventListener("input", buscarContactos);
    contactoForm?.addEventListener("submit", agregarContacto);
    contactoForm?.addEventListener("input", limpiarErrorContactoFormulario);
    const buscador = document.getElementById("buscar");
    if (buscador) requestAnimationFrame(() => buscador.focus());
});

function inicializarModalContacto() {
    contactoModal = document.getElementById("contacto-modal");
    contactoForm = document.getElementById("contacto-form");
    document.getElementById("abrir-contacto-modal")?.addEventListener("click", abrirModalContacto);

    contactoModal?.querySelectorAll("[data-close-contacto-modal]").forEach(trigger => {
        trigger.addEventListener("click", cerrarModalContacto);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && contactoModal?.classList.contains("is-active")) {
            cerrarModalContacto();
        }
    });
}

function abrirModalContacto() {
    if (!contactoModal || !contactoForm) return;
    contactoModal.classList.add("is-active");
    contactoModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    limpiarErrorContactoFormulario();
    contactoForm.reset();
    const primerCampo = contactoForm.querySelector("input, select");
    if (primerCampo) setTimeout(() => primerCampo.focus(), 50);
}

function cerrarModalContacto() {
    if (!contactoModal || !contactoForm) return;
    contactoModal.classList.remove("is-active");
    contactoModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    limpiarErrorContactoFormulario();
    contactoForm.reset();
}

function cargarClientesEnFormulario(selectId, idSeleccionado = null) {
    fetchAPI("/api/clientes?incluir_fallecidos=true")
        .then(clientes => {
            const select = document.getElementById(selectId);
            if (!select) return;

            const placeholder = selectId === "form-cliente-contacto"
                ? '<option value="">Selecciona un cliente</option>'
                : "";
            select.innerHTML = placeholder;

            clientes.forEach(cliente => {
                const option = document.createElement("option");
                option.value = String(cliente.id_cliente);
                option.textContent = `${cliente.nombre}${cliente.apellidos ? ` ${cliente.apellidos}` : ""}`;
                if (Number(cliente.id_cliente) === Number(idSeleccionado)) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        })
        .catch(error => console.error("🚨 Error cargando clientes para contactos:", error));
}

function cargarContactos(busqueda = "") {
    const container = document.getElementById("lista-contactos");
    const muestraContacto = document.getElementById("muestra-contacto");
    if (!container || !muestraContacto) return;

    muestraContacto.innerHTML = "";
    muestraContacto.style.display = "none";
    container.style.display = "block";
    contactoDetalleActual = null;
    mostrarLoadingContactos(container);

    const params = new URLSearchParams({ buscar: busqueda });
    fetchAPI(`/api/contactos?${params.toString()}`)
        .then(contactos => {
            container.removeAttribute("aria-busy");
            container.innerHTML = "";

            if (!Array.isArray(contactos) || contactos.length === 0) {
                container.innerHTML = `<p class="cliente-empty" style="text-align:center;">No hay contactos para mostrar.</p>`;
                return;
            }

            const contactosPorCliente = new Map();
            contactos.forEach(contacto => {
                const idCliente = Number(contacto.id_cliente) || 0;
                if (!contactosPorCliente.has(idCliente)) {
                    contactosPorCliente.set(idCliente, {
                        nombre: contacto.nombre_cliente ?? "Cliente",
                        apellidos: contacto.apellidos_cliente ?? "",
                        contactos: []
                    });
                }
                contactosPorCliente.get(idCliente).contactos.push(contacto);
            });

            Array.from(contactosPorCliente.values()).forEach(grupo => {
                const clienteHeader = document.createElement("h3");
                clienteHeader.textContent = `${grupo.nombre}${grupo.apellidos ? ` ${grupo.apellidos}` : ""}`;
                container.appendChild(clienteHeader);

                grupo.contactos.forEach(contacto => {
                    const contactoDiv = document.createElement("div");
                    contactoDiv.classList.add("animal");
                    contactoDiv.setAttribute("data-id", String(contacto.id_contacto));
                    contactoDiv.addEventListener("click", () => obtenerDetallesContacto(contacto.id_contacto));
                    contactoDiv.innerHTML = `
                        <div class="animal-content">
                            <div class="detalles">
                                <p><span class="nombreAnimal">${escaparHTML(contacto.nombre)}${contacto.apellidos ? ` ${escaparHTML(contacto.apellidos)}` : ""}</span></p>
                                <p><span class="encabezado">Cliente:</span> ${escaparHTML(grupo.nombre)}${grupo.apellidos ? ` ${escaparHTML(grupo.apellidos)}` : ""}</p>
                                <p><span class="encabezado">Teléfono:</span> ${escaparHTML(contacto.telefono || "-")}</p>
                                <p><span class="encabezado">Email:</span> ${escaparHTML(contacto.email || "-")}</p>
                            </div>
                        </div>
                    `;
                    container.appendChild(contactoDiv);
                });
            });
        })
        .catch(error => {
            console.error("🚨 Error cargando contactos:", error);
            container.removeAttribute("aria-busy");
            container.innerHTML = `<p class="cliente-empty" style="text-align:center;">Error al cargar los contactos.</p>`;
        });
}

function buscarContactos(event) {
    cargarContactos(event.target.value);
}

function agregarContacto(event) {
    event.preventDefault();
    limpiarErrorContactoFormulario();

    const nombre = document.getElementById("form-nombre-contacto")?.value.trim() ?? "";
    const apellidos = document.getElementById("form-apellidos-contacto")?.value.trim() ?? "";
    const idCliente = document.getElementById("form-cliente-contacto")?.value ?? "";
    const telefono = document.getElementById("form-telefono-contacto")?.value.trim() ?? "";
    const email = document.getElementById("form-email-contacto")?.value.trim() ?? "";

    if (!nombre) {
        mostrarErrorContactoFormulario("El campo 'nombre' es obligatorio.");
        return;
    }
    if (!idCliente) {
        mostrarErrorContactoFormulario("Debes seleccionar un cliente.");
        return;
    }

    fetchAPI("/api/contactos", {
        method: "POST",
        body: JSON.stringify({ nombre, apellidos, id_cliente: idCliente, telefono, email })
    }).then(() => {
        cerrarModalContacto();
        cargarContactos(document.getElementById("buscar")?.value ?? "");
    }).catch(error => {
        console.error("🚨 Error al crear contacto:", error);
        mostrarErrorContactoFormulario(obtenerMensajeError(error, "No se pudo crear el contacto."));
    });
}

function obtenerDetallesContacto(idContacto) {
    fetchAPI(`/api/contactos/${idContacto}`)
        .then(contacto => {
            contactoDetalleActual = contacto;
            const container = document.getElementById("lista-contactos");
            const muestraContacto = document.getElementById("muestra-contacto");
            if (!container || !muestraContacto) return;

            container.style.display = "none";
            muestraContacto.style.display = "block";

            const nombreCompleto = `${contacto.nombre ?? ""}${contacto.apellidos ? ` ${contacto.apellidos}` : ""}`.trim();
            const nombreCliente = `${contacto.nombre_cliente ?? ""}${contacto.apellidos_cliente ? ` ${contacto.apellidos_cliente}` : ""}`.trim();

            muestraContacto.innerHTML = `
                <div class="animal-detalle-card">
                    <div class="animal-detalle-header">
                        <div>
                            <p class="animal-detalle-nombre">${escaparHTML(nombreCompleto || "Sin nombre")}</p>
                            ${nombreCliente ? `<p class="animal-detalle-cliente">${escaparHTML(nombreCliente)}</p>` : ""}
                        </div>
                        <div class="animal-detalle-actions">
                            <button type="button" class="btn-secundario" id="btn-volver-contactos">Volver</button>
                            <button type="button" class="btn-principal" id="btn-modificar-contacto">Modificar</button>
                            <button type="button" class="btn-peligro" id="btn-eliminar-contacto">Eliminar</button>
                        </div>
                    </div>
                    <div class="cliente-info-grid">
                        <div class="cliente-section">
                            <p class="cliente-section-title">Datos del contacto</p>
                            <p><span class="cliente-label">Nombre</span>${escaparHTML(nombreCompleto || "-")}</p>
                            <p><span class="cliente-label">Teléfono</span>${escaparHTML(contacto.telefono || "-")}</p>
                            <p><span class="cliente-label">Email</span>${escaparHTML(contacto.email || "-")}</p>
                        </div>
                        <div class="cliente-section">
                            <p class="cliente-section-title">Cliente asociado</p>
                            <p><span class="cliente-label">Cliente</span>${escaparHTML(nombreCliente || "-")}</p>
                            <p><span class="cliente-label">ID cliente</span>${escaparHTML(String(contacto.id_cliente ?? "-"))}</p>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById("btn-volver-contactos")?.addEventListener("click", () => volverAlListadoContactos(true));
            document.getElementById("btn-modificar-contacto")?.addEventListener("click", mostrarFormularioEdicionContacto);
            document.getElementById("btn-eliminar-contacto")?.addEventListener("click", () => confirmarEliminacionContacto(contacto.id_contacto));
        })
        .catch(error => console.error("🚨 Error al obtener el contacto:", error));
}

function mostrarFormularioEdicionContacto() {
    if (!contactoDetalleActual) return;
    const muestraContacto = document.getElementById("muestra-contacto");
    if (!muestraContacto) return;

    const contacto = contactoDetalleActual;
    const nombreCompleto = `${contacto.nombre ?? ""}${contacto.apellidos ? ` ${contacto.apellidos}` : ""}`.trim();

    muestraContacto.innerHTML = `
        <div class="cliente-detalle-card cliente-edit-card">
            <div class="cliente-edit-header">
                <h3 class="cliente-edit-title">Modificar contacto</h3>
                <p class="cliente-id-info">ID Contacto: ${contacto.id_contacto}</p>
            </div>
            <form id="form-editar-contacto" class="cliente-edit-form" novalidate>
                <div id="form-editar-contacto-error" class="modal-error" role="alert" aria-live="assertive" hidden></div>
                <div class="form-columns">
                    <div class="form-column">
                        <label for="edit_contacto_nombre">Nombre</label>
                        <input type="text" id="edit_contacto_nombre" value="${escaparHTML(contacto.nombre ?? "")}" required>
                        <label for="edit_contacto_apellidos">Apellidos</label>
                        <input type="text" id="edit_contacto_apellidos" value="${escaparHTML(contacto.apellidos ?? "")}">
                        <label for="edit_contacto_cliente">Cliente</label>
                        <select id="edit_contacto_cliente" required></select>
                    </div>
                    <div class="form-column">
                        <label for="edit_contacto_telefono">Teléfono</label>
                        <input type="text" id="edit_contacto_telefono" value="${escaparHTML(contacto.telefono ?? "")}">
                        <label for="edit_contacto_email">Email</label>
                        <input type="email" id="edit_contacto_email" value="${escaparHTML(contacto.email ?? "")}">
                        <p class="cliente-empty">Contacto actual: ${escaparHTML(nombreCompleto || "-")}</p>
                    </div>
                </div>
                <div class="cliente-edit-actions">
                    <button type="button" class="btn-secundario" id="cancelar-edicion-contacto">Cancelar</button>
                    <button type="submit" class="btn-principal">Guardar cambios</button>
                </div>
            </form>
        </div>
    `;

    cargarClientesEnFormulario("edit_contacto_cliente", contacto.id_cliente);
    document.getElementById("cancelar-edicion-contacto")?.addEventListener("click", () => obtenerDetallesContacto(contacto.id_contacto));
    document.getElementById("form-editar-contacto")?.addEventListener("submit", guardarCambiosContacto);
}

function limpiarErrorEdicionContacto() {
    const errorBox = document.getElementById("form-editar-contacto-error");
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.hidden = true;
}

function mostrarErrorEdicionContacto(mensaje) {
    const errorBox = document.getElementById("form-editar-contacto-error");
    if (!errorBox) return;
    errorBox.textContent = mensaje;
    errorBox.hidden = false;
}

function guardarCambiosContacto(event) {
    event.preventDefault();
    if (!contactoDetalleActual) return;
    limpiarErrorEdicionContacto();

    const nombre = document.getElementById("edit_contacto_nombre")?.value.trim() ?? "";
    const apellidos = document.getElementById("edit_contacto_apellidos")?.value.trim() ?? "";
    const idCliente = document.getElementById("edit_contacto_cliente")?.value ?? "";
    const telefono = document.getElementById("edit_contacto_telefono")?.value.trim() ?? "";
    const email = document.getElementById("edit_contacto_email")?.value.trim() ?? "";

    if (!nombre) {
        mostrarErrorEdicionContacto("El campo 'nombre' es obligatorio.");
        return;
    }
    if (!idCliente) {
        mostrarErrorEdicionContacto("Debes seleccionar un cliente.");
        return;
    }

    fetchAPI(`/api/contactos/${contactoDetalleActual.id_contacto}`, {
        method: "PUT",
        body: JSON.stringify({ nombre, apellidos, id_cliente: idCliente, telefono, email })
    }).then(() => {
        obtenerDetallesContacto(contactoDetalleActual.id_contacto);
        cargarContactos(document.getElementById("buscar")?.value ?? "");
    }).catch(error => {
        console.error("🚨 Error al actualizar el contacto:", error);
        mostrarErrorEdicionContacto(obtenerMensajeError(error, "No se pudo actualizar el contacto."));
    });
}

function volverAlListadoContactos(recargar = false) {
    const container = document.getElementById("lista-contactos");
    const muestraContacto = document.getElementById("muestra-contacto");
    if (!container || !muestraContacto) return;

    container.style.display = "block";
    muestraContacto.style.display = "none";
    muestraContacto.innerHTML = "";

    if (recargar) {
        cargarContactos(document.getElementById("buscar")?.value ?? "");
    }
}

function confirmarEliminacionContacto(idContacto) {
    if (!idContacto) return;
    const confirmar = window.confirm("¿Seguro que quieres eliminar este contacto? Esta acción no se puede deshacer.");
    if (!confirmar) return;

    fetchAPI(`/api/contactos/${idContacto}`, { method: "DELETE" })
        .then(() => volverAlListadoContactos(true))
        .catch(error => console.error("🚨 Error al eliminar el contacto:", error));
}
