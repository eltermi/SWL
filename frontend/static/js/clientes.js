/* Contenido base para clientes.js */
let contratoModal = null;
let contratoForm = null;
let contratoModalCliente = null;
let clienteModal = null;
let clienteForm = null;
let animalModal = null;
let animalForm = null;
let animalModalCliente = null;
let animalEnEdicionId = null;
let idClienteContrato = null;
let idClienteAnimal = null;
let clienteDetalleActual = null;
let contratoEnEdicionId = null;
let contratosClienteActuales = [];
let animalesClienteActuales = [];
let tarifasContrato = [];
let tarifaSelect = null;
const MEDICACION_ALLOWED_TAGS = new Set(["P", "BR", "UL", "OL", "LI", "STRONG", "EM", "B", "I", "DIV"]);

const CAMPOS_OBLIGATORIOS_CONTRATO = [
    { id: "fecha_inicio", nombre: "Fecha de inicio" },
    { id: "fecha_fin", nombre: "Fecha de fin" },
    { id: "numero_visitas_diarias", nombre: "Número de visitas diarias" },
    { id: "numero_visitas_totales", nombre: "Número de visitas totales" },
    { id: "tarifa_contrato", nombre: "Tarifa del contrato" },
    { id: "pagado", nombre: "Pagado (€)" }
];
const MS_POR_DIA = 24 * 60 * 60 * 1000;
const MAX_WHATSAPP_AVATAR_BYTES = 2 * 1024 * 1024;

function crearLoadingStateHTML({ mensaje, subtitulo = "", skeletons = "" }) {
    return `
        <div class="loading-state" role="status" aria-live="polite">
            <p class="loading-state-message">${mensaje}</p>
            ${subtitulo ? `<p class="loading-state-subtext">${subtitulo}</p>` : ""}
            ${skeletons}
        </div>
    `;
}

function crearClientesSkeletons() {
    return `
        <div class="loading-skeleton-list" aria-hidden="true">
            <div class="loading-skeleton-card">
                <span class="loading-skeleton-line loading-skeleton-line--medium loading-skeleton-line--title"></span>
                <span class="loading-skeleton-line loading-skeleton-line--long"></span>
                <span class="loading-skeleton-line loading-skeleton-line--short"></span>
            </div>
            <div class="loading-skeleton-card">
                <span class="loading-skeleton-line loading-skeleton-line--short loading-skeleton-line--title"></span>
                <span class="loading-skeleton-line loading-skeleton-line--medium"></span>
                <span class="loading-skeleton-line loading-skeleton-line--medium"></span>
            </div>
            <div class="loading-skeleton-card">
                <span class="loading-skeleton-line loading-skeleton-line--medium loading-skeleton-line--title"></span>
                <span class="loading-skeleton-line loading-skeleton-line--long"></span>
                <span class="loading-skeleton-line loading-skeleton-line--short"></span>
            </div>
        </div>
    `;
}

function mostrarLoadingClientes(container) {
    if (!container) return;
    container.setAttribute("aria-busy", "true");
    container.innerHTML = crearLoadingStateHTML({
        mensaje: "Cargando clientes...",
        subtitulo: "Consultando la base de datos y preparando la lista.",
        skeletons: crearClientesSkeletons()
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

function convertirTextoPlanoAMedicacionHTML(texto) {
    const contenido = String(texto ?? "").replace(/\r/g, "").trim();
    if (!contenido) return "";

    return contenido
        .split(/\n{2,}/)
        .map(parrafo => `<p>${parrafo.split("\n").map(escaparHTML).join("<br>")}</p>`)
        .join("");
}

function sanitizarMedicacionHTML(valor) {
    const contenido = String(valor ?? "").trim();
    if (!contenido) return "";

    const htmlInicial = /<\/?[a-z][\s\S]*>/i.test(contenido)
        ? contenido
        : convertirTextoPlanoAMedicacionHTML(contenido);

    const template = document.createElement("template");
    template.innerHTML = htmlInicial;

    const limpiarNodo = nodo => {
        Array.from(nodo.childNodes).forEach(child => {
            if (child.nodeType === Node.COMMENT_NODE) {
                child.remove();
                return;
            }

            if (child.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            const tag = child.tagName.toUpperCase();

            if (tag === "SCRIPT" || tag === "STYLE") {
                child.remove();
                return;
            }

            limpiarNodo(child);

            if (!MEDICACION_ALLOWED_TAGS.has(tag)) {
                const fragment = document.createDocumentFragment();
                while (child.firstChild) {
                    fragment.appendChild(child.firstChild);
                }
                child.replaceWith(fragment);
                return;
            }

            Array.from(child.attributes).forEach(attr => {
                child.removeAttribute(attr.name);
            });
        });
    };

    limpiarNodo(template.content);
    return template.innerHTML.trim();
}

function actualizarEstadoEditorMedicacion(editor) {
    if (!editor) return;
    const texto = editor.textContent.replace(/\u00a0/g, " ").trim();
    editor.classList.toggle("is-empty", texto.length === 0);
}

function inicializarEditoresMedicacion(root = document) {
    root.querySelectorAll(".rich-editor-button").forEach(button => {
        if (button.dataset.editorBound === "true") return;
        button.dataset.editorBound = "true";
        button.addEventListener("click", () => ejecutarComandoEditorMedicacion(button));
    });

    root.querySelectorAll(".rich-editor-input").forEach(editor => {
        if (editor.dataset.editorBound === "true") {
            actualizarEstadoEditorMedicacion(editor);
            return;
        }
        editor.dataset.editorBound = "true";
        editor.addEventListener("input", () => actualizarEstadoEditorMedicacion(editor));
        editor.addEventListener("blur", () => actualizarEstadoEditorMedicacion(editor));
        actualizarEstadoEditorMedicacion(editor);
    });
}

function ejecutarComandoEditorMedicacion(button) {
    const editorId = button.dataset.editorTarget;
    const command = button.dataset.command;
    const value = button.dataset.value || null;
    const editor = document.getElementById(editorId);
    if (!editor || !command) return;

    editor.focus();
    if (command === "formatBlock" && value) {
        document.execCommand(command, false, value);
    } else {
        document.execCommand(command, false, null);
    }
    actualizarEstadoEditorMedicacion(editor);
}

function establecerContenidoEditorMedicacion(editorId, valor) {
    const editor = document.getElementById(editorId);
    if (!editor) return;
    editor.innerHTML = sanitizarMedicacionHTML(valor);
    actualizarEstadoEditorMedicacion(editor);
}

function obtenerContenidoEditorMedicacion(editorId) {
    const editor = document.getElementById(editorId);
    if (!editor) return "";

    const html = sanitizarMedicacionHTML(editor.innerHTML);
    const texto = editor.textContent.replace(/\u00a0/g, " ").trim();
    return texto ? html : "";
}

function renderizarMedicacionAnimal(valor) {
    const html = sanitizarMedicacionHTML(valor);
    return html || "";
}

function construirBloqueMedicacionAnimal(valor) {
    const medicacionHTML = renderizarMedicacionAnimal(valor);
    if (!medicacionHTML) return "";

    return `
        <div>
            <span class="cliente-label">Medicación</span>
            <div class="medicacion-render">${medicacionHTML}</div>
        </div>
    `;
}

function construirAvatarClienteHTML(avatar, nombreCompleto, clase = "") {
    if (!avatar) return "";
    const claseFinal = clase ? ` ${clase}` : "";
    return `
        <div class="cliente-whatsapp-avatar${claseFinal}">
            <img src="${avatar}" alt="Avatar de WhatsApp de ${escaparHTML(nombreCompleto || "cliente")}">
        </div>
    `;
}

function validarArchivoAvatar(archivo) {
    if (!archivo) return null;
    if (!archivo.type.startsWith("image/")) {
        return "El avatar de WhatsApp debe ser una imagen.";
    }
    if (archivo.size > MAX_WHATSAPP_AVATAR_BYTES) {
        return "La imagen del avatar supera el máximo de 2 MB.";
    }
    return null;
}

function validarArchivoFotoAnimal(archivo) {
    if (!archivo) return null;
    if (archivo.size === 0) {
        return "La foto seleccionada está vacía.";
    }
    if (archivo.type && !archivo.type.startsWith("image/")) {
        return "La foto del animal debe ser una imagen.";
    }
    return null;
}

document.addEventListener('DOMContentLoaded', function () {
    inicializarEditoresMedicacion();
    cargarClientes();
    document.getElementById('buscar').addEventListener('input', buscarClientes);
    document.getElementById('mostrar-fallecidos-clientes')?.addEventListener('change', () => {
        cargarClientes(document.getElementById('buscar')?.value ?? "");
    });
    enfocarBuscadorClientes();
    inicializarModalCliente();
    inicializarEventosDetalleCliente();
    inicializarModalContrato();
    inicializarModalAnimal();
    cargarTarifasContrato();
    procesarAccesoDirectoContrato();
});

function enfocarBuscadorClientes() {
    const buscador = document.getElementById('buscar');
    if (!buscador) return;
    requestAnimationFrame(() => buscador.focus());
}

function inicializarEventosDetalleCliente() {
    const contenedorDetalle = document.getElementById("muestra-cliente");
    if (!contenedorDetalle) return;

    contenedorDetalle.addEventListener("click", event => {
        const target = event.target instanceof Element ? event.target : null;
        const botonAnimal = target?.closest('[data-action="abrir-modal-animal"]');
        if (botonAnimal) {
            const idCliente = Number(botonAnimal.dataset.idCliente);
            mostrarFormularioAnimal(idCliente);
            return;
        }

        const botonEditarAnimal = target?.closest('[data-action="editar-animal"]');
        if (botonEditarAnimal) {
            const idAnimal = Number(botonEditarAnimal.dataset.idAnimal);
            mostrarFormularioEdicionAnimal(idAnimal);
        }
    });
}

function procesarAccesoDirectoContrato() {
    const params = new URLSearchParams(window.location.search);
    const idCliente = Number(params.get("id_cliente"));
    const idContrato = Number(params.get("editar_contrato"));
    if (!Number.isFinite(idCliente) || idCliente <= 0) {
        return;
    }

    obtenerDetallesCliente(idCliente).then(() => {
        if (Number.isFinite(idContrato) && idContrato > 0) {
            mostrarFormularioEdicionContrato(idContrato);
        }
    }).catch(error => {
        console.error("No se pudo abrir el acceso directo al contrato:", error);
    });
}

function fetchAPI(url, options = {}) {
    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.href = "/";
        return Promise.reject("No hay token");
    }

    const headers = {
        "Authorization": `Bearer ${token}`,
        ...(options.headers || {})
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    return fetch(url, {
        ...options,
        headers
    }).then(async response => {
        let data = {};
        try {
            data = await response.json();
        } catch (_) {
            data = {};
        }

        if (!response.ok) {
            const mensaje = data?.mensaje || data?.message || "Error en la API.";
            throw new Error(mensaje);
        }

        return data;
    });
}

function obtenerMensajeError(error, fallback = "No se pudo completar la operación.") {
    const mensaje = String(error?.message || "").trim();
    return mensaje || fallback;
}

function limpiarErrorClienteFormulario() {
    const errorBox = document.getElementById("form-cliente-error");
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.hidden = true;
}

function mostrarErrorClienteFormulario(mensaje) {
    const errorBox = document.getElementById("form-cliente-error");
    if (!errorBox) return;
    errorBox.textContent = mensaje;
    errorBox.hidden = false;
}

function inicializarModalCliente() {
    clienteModal = document.getElementById("cliente-modal");
    clienteForm = document.getElementById("cliente-form");
    const abrirClienteModalBtn = document.getElementById("abrir-cliente-modal");
    if (!clienteModal || !clienteForm) return;

    abrirClienteModalBtn?.addEventListener("click", abrirModalCliente);
    clienteForm.addEventListener("submit", agregarCliente);
    clienteForm.addEventListener("input", limpiarErrorClienteFormulario);

    const closeTriggers = clienteModal.querySelectorAll("[data-close-cliente-modal]");
    closeTriggers.forEach(trigger => {
        trigger.addEventListener("click", cerrarModalCliente);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && clienteModal.classList.contains("is-active")) {
            cerrarModalCliente();
        }
    });
}

function abrirModalCliente() {
    if (!clienteModal || !clienteForm) return;
    clienteModal.classList.add("is-active");
    clienteModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    limpiarErrorClienteFormulario();
    const primerCampo = clienteForm.querySelector("input, select, textarea");
    if (primerCampo) {
        setTimeout(() => primerCampo.focus(), 50);
    }
}

function cerrarModalCliente() {
    if (!clienteModal || !clienteForm) return;
    clienteModal.classList.remove("is-active");
    clienteModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    limpiarErrorClienteFormulario();
    clienteForm.reset();
}

function limpiarErrorEdicionCliente() {
    const errorBox = document.getElementById("form-editar-cliente-error");
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.hidden = true;
}

function mostrarErrorEdicionCliente(mensaje) {
    const errorBox = document.getElementById("form-editar-cliente-error");
    if (!errorBox) return;
    errorBox.textContent = mensaje;
    errorBox.hidden = false;
}

function formatearImporte(valor) {
    if (valor === undefined || valor === null || valor === "") return "-";
    const numero = Number(valor);
    if (Number.isNaN(numero)) return "-";
    return numero.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function crearPagoCard({ etiqueta, importe, esTotal = false }) {
    const importeFormateado = formatearImporte(importe);
    if (esTotal || etiqueta === "Pendiente") {
        return `
            <div class="pago-card pago-card-total">
                <span class="pago-label">${etiqueta}</span>
                <strong>${importeFormateado}</strong>
            </div>
        `;
    }

    return `
        <div class="pago-card">
            <span class="pago-label">${etiqueta}</span>
            <strong>${importeFormateado}</strong>
        </div>
    `;
}

function normalizarHorarioContrato(horario) {
    if (!horario) return null;
    if (typeof horario === "object") return horario;
    if (typeof horario === "string") {
        try {
            return JSON.parse(horario);
        } catch (error) {
            console.warn("No se pudo parsear el horario del contrato:", error);
            return null;
        }
    }
    return null;
}

function renderHorarioContrato(horario) {
    if (!horario || typeof horario !== "object") return "";

    const bloques = [];
    const manana = typeof horario.Mañana === "string" ? horario.Mañana.trim() : "";
    const tarde = typeof horario.Tarde === "string" ? horario.Tarde.trim() : "";

    if (manana) {
        bloques.push({ etiqueta: "Mañana", valor: manana });
    }
    if (tarde) {
        bloques.push({ etiqueta: "Tarde", valor: tarde });
    }

    if (!bloques.length) return "";

    const bloquesHTML = bloques.map(({ etiqueta, valor }) => `
        <div class="horario-bloque">
            <span class="horario-bloque-label">${etiqueta}</span>
            <span>${valor}</span>
        </div>
    `).join("");

    return `<div class="horario-bloques">${bloquesHTML}</div>`;
}

function parseFechaContrato(fechaTexto) {
    if (!fechaTexto || typeof fechaTexto !== "string") return null;
    const partes = fechaTexto.split("-");
    if (partes.length !== 3) return null;
    const [dia, mes, anio] = partes;
    const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function crearFechaUTCDesdeInput(fechaTexto) {
    if (!fechaTexto || typeof fechaTexto !== "string") return null;
    const partes = fechaTexto.split("-");
    if (partes.length !== 3) return null;
    const [anio, mes, dia] = partes;
    const fechaUTC = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
    return Number.isNaN(fechaUTC.getTime()) ? null : fechaUTC;
}

function crearFechaUTCDesdeDisplay(fechaTexto) {
    if (!fechaTexto || typeof fechaTexto !== "string") return null;
    const partes = fechaTexto.split("-");
    if (partes.length !== 3) return null;
    const [dia, mes, anio] = partes;
    const fechaUTC = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
    return Number.isNaN(fechaUTC.getTime()) ? null : fechaUTC;
}

function calcularDiasCalendario(inicio, fin) {
    if (!(inicio instanceof Date) || Number.isNaN(inicio.getTime())) return 0;
    if (!(fin instanceof Date) || Number.isNaN(fin.getTime())) return 0;
    const diferencia = fin.getTime() - inicio.getTime();
    if (diferencia < 0) return 0;
    return Math.round(diferencia / MS_POR_DIA) + 1;
}

function convertirFechaDisplayAInput(fechaTexto) {
    if (!fechaTexto || typeof fechaTexto !== "string") return "";
    const partes = fechaTexto.split("-");
    if (partes.length !== 3) return "";
    const [dia, mes, anio] = partes;
    return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

function calcularTotalVisitasContrato(contrato) {
    if (!contrato) return null;
    const numTotalVisitas = Number(contrato.num_total_visitas);
    if (Number.isFinite(numTotalVisitas) && numTotalVisitas >= 0) {
        return numTotalVisitas;
    }
    const inicio = crearFechaUTCDesdeDisplay(contrato.fecha_inicio);
    const fin = crearFechaUTCDesdeDisplay(contrato.fecha_fin);
    const visitasDiarias = Number(contrato.visitas);

    if (!inicio || !fin || Number.isNaN(visitasDiarias) || visitasDiarias <= 0) {
        return null;
    }

    const dias = calcularDiasCalendario(inicio, fin);
    return dias > 0 ? dias * visitasDiarias : null;
}

function esContratoFinalizado(contrato) {
    if (!contrato) return false;
    const fechaFin = parseFechaContrato(contrato.fecha_fin);
    if (!fechaFin) return false;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fechaFin < hoy;
}

function cargarClientes(busqueda = "") {
    const container = document.getElementById("lista-clientes");
    const muestraCliente = document.getElementById("muestra-cliente");

    muestraCliente.innerHTML = "";
    muestraCliente.style.display = "none";
    container.style.display = "block";
    clienteDetalleActual = null;
    mostrarLoadingClientes(container);
    const incluirFallecidos = Boolean(document.getElementById("mostrar-fallecidos-clientes")?.checked);
    const params = new URLSearchParams({
        buscar: busqueda,
        incluir_fallecidos: incluirFallecidos ? "true" : "false"
    });

    fetchAPI(`/api/clientes?${params.toString()}`)
        .then(clientes => {
            container.removeAttribute("aria-busy");
            container.innerHTML = "";
            if (!Array.isArray(clientes) || clientes.length === 0) {
                container.innerHTML = `<p class="cliente-empty" style="text-align:center;">No hay clientes para mostrar.</p>`;
                return;
            }
            clientes.forEach(cliente => {
                const textoLista = valor => {
                    const texto = typeof valor === "string" ? valor.trim() : valor;
                    return texto ? escaparHTML(String(texto)) : "...";
                };
                const nombreCompleto = [cliente.nombre, cliente.apellidos]
                    .map(valor => typeof valor === "string" ? valor.trim() : "")
                    .filter(Boolean)
                    .join(" ");
                const calle = textoLista(cliente.calle);
                const ubicacion = (cliente.codigo_postal || cliente.municipio)
                    ? `L-${textoLista(cliente.codigo_postal)}, ${textoLista(cliente.municipio)}`
                    : "...";
                const telefono = textoLista(cliente.telefono);
                const gatos = textoLista(cliente.gatos);
                const clienteDiv = document.createElement("div");
                clienteDiv.classList.add("cliente");
                if (cliente.solo_fallecidos) {
                    clienteDiv.classList.add("cliente--solo-fallecidos");
                }
                clienteDiv.setAttribute("data-id", cliente.id_cliente);
                clienteDiv.addEventListener("click", () => {
                    obtenerDetallesCliente(cliente.id_cliente);
                });
                const estadoCliente = cliente.solo_fallecidos
                    ? `<p class="entity-status-badge entity-status-badge--fallecido">Solo animales fallecidos</p>`
                    : "";

                clienteDiv.innerHTML = `
                    <div class="cliente-content">
                        <div class="detalles">
                            <p class="nombreCliente">${textoLista(nombreCompleto)}</p>
                            <p>${calle}</p>
                            <p>${ubicacion}</p>
                            <p>${telefono}</p>
                        </div>
                        <div class="detalles">
                            <p class="nombreAnimal">${gatos}</p>
                            ${estadoCliente}
                            <p>&nbsp;</p>
                            <p>&nbsp;</p>
                            <p>&nbsp;</p>
                        </div>
                    </div>
                `;
                container.appendChild(clienteDiv);
            });
        })
        .catch(error => {
            console.error("\uD83D\uDEA8 Error cargando clientes:", error);
            container.removeAttribute("aria-busy");
            container.innerHTML = `<p class="cliente-empty" style="text-align:center;">Error al cargar los clientes.</p>`;
        });
}
function obtenerDetallesCliente(id_cliente) {
    return fetchAPI(`/api/clientes/${id_cliente}`)
        .then(cliente => {
            const container = document.getElementById("lista-clientes");
            const muestraCliente = document.getElementById("muestra-cliente");

            container.style.display = "none";
            muestraCliente.style.display = "block";

            clienteDetalleActual = cliente;
            const contactosAdicionales = Array.isArray(cliente.contactos_adicionales)
                ? cliente.contactos_adicionales
                : (cliente.ad_nombre ? [{
                    nombre: cliente.ad_nombre,
                    apellidos: cliente.ad_apellidos,
                    telefono: cliente.ad_telefono,
                    email: cliente.ad_email
                }] : []);

            const nombreCompleto = `${cliente.nombre ?? ""}${cliente.apellidos ? " " + cliente.apellidos : ""}`.trim();
            const avatarClienteHTML = construirAvatarClienteHTML(cliente.whatsapp_avatar, nombreCompleto);
            const emailHTML = cliente.email
                ? `<p class="cliente-email"><a href="mailto:${cliente.email}">${cliente.email}</a></p>`
                : "";
            const contactoPrincipal = contactosAdicionales[0] || null;
            const contactoAlternativo = contactoPrincipal
                ? `
                        <div class="cliente-alt-contact">
                            <p class="cliente-label">Contacto alternativo</p>
                            <p class="cliente-alt-nombre">${escaparHTML(contactoPrincipal.nombre ?? "")}${contactoPrincipal.apellidos ? ` ${escaparHTML(contactoPrincipal.apellidos)}` : ""}</p>
                            ${contactoPrincipal.telefono ? `<p class="cliente-alt-telefono">${escaparHTML(contactoPrincipal.telefono)}</p>` : ""}
                        </div>`
                : "";

            const lineaCalle = [cliente.calle, cliente.piso].filter(Boolean).join(cliente.calle && cliente.piso ? " · " : "");
            const localidadPartes = [];
            if (cliente.codigo_postal) {
                localidadPartes.push(`L-${cliente.codigo_postal}`);
            }
            if (cliente.municipio) {
                localidadPartes.push(cliente.municipio);
            }
            const lineaLocalidad = localidadPartes.join(", ");
            const bloquesDireccion = [lineaCalle, lineaLocalidad, cliente.pais].filter(bloque => bloque && bloque.trim().length > 0)
                .map(bloque => `<p>${bloque}</p>`).join("");
            const contenidoDireccion = bloquesDireccion || `<p class="cliente-empty">Sin dirección registrada</p>`;

            const referencia = cliente.referencia ?? cliente.referencia_origen ?? "";
            const datosSecundarios = [
                cliente.nacionalidad ? `<p><span class="cliente-label">Nacionalidad</span>${cliente.nacionalidad}</p>` : "",
                cliente.idioma ? `<p><span class="cliente-label">Idioma(s) de contacto</span>${cliente.idioma}</p>` : "",
                cliente.genero ? `<p><span class="cliente-label">Género</span>${cliente.genero}</p>` : "",
                referencia ? `<p><span class="cliente-label">Referencia</span>${referencia}</p>` : ""
            ].filter(Boolean);
            const contenidoDatos = datosSecundarios.length > 0 ? datosSecundarios.join("") : `<p class="cliente-empty">Sin datos adicionales</p>`;

            let contenidoHTML = `
                <div class="cliente-detalle-card">
                    <div class="cliente-header">
                        <div class="cliente-main-block">
                            <div class="cliente-main-contact">
                                <p class="cliente-nombre">${nombreCompleto}</p>
                                ${cliente.telefono ? `<p class="cliente-telefono">${cliente.telefono}</p>` : ""}
                                ${emailHTML}
                            </div>
                            ${avatarClienteHTML}
                        </div>
                        ${contactoAlternativo}
                    </div>
                    <div class="cliente-info-grid">
                        <div class="cliente-section">
                            <p class="cliente-section-title">Dirección</p>
                            ${contenidoDireccion}
                        </div>
                        <div class="cliente-section">
                            <p class="cliente-section-title">Datos</p>
                            ${contenidoDatos}
                        </div>
                    </div>
                </div>
                <div class="cliente-actions">
                    <button class="btn-secundario" onclick="cargarClientes()">Volver a clientes</button>
                    <button class="btn-secundario" onclick="mostrarFormularioEdicionCliente()">Modificar</button>
                    <button class="btn-principal" data-nombre-cliente="${encodeURIComponent(nombreCompleto)}" onclick="mostrarFormularioContrato(${id_cliente}, decodeURIComponent(this.dataset.nombreCliente || ''))">Nuevo contrato</button>
                </div>
            `;

            const animalesPromise = fetchAPI(`/api/animales/cliente/${id_cliente}`)
                .catch(error => {
                    console.error("🚨 Error cargando animales del cliente:", error);
                    return [];
                });

            const contratosPromise = fetchAPI(`/api/clientes/${id_cliente}/contratos`)
                .catch(error => {
                    console.error("🚨 Error cargando contratos del cliente:", error);
                    return [];
                });

            return Promise.all([contratosPromise, animalesPromise])
                .then(([contratos, animales]) => {
                    contratosClienteActuales = Array.isArray(contratos) ? contratos : [];
                    animalesClienteActuales = Array.isArray(animales) ? animales : [];
                    contenidoHTML += construirContactosAdicionalesHTML(contactosAdicionales);
                    contenidoHTML += construirAnimalesHTML(animales);
                    contenidoHTML += construirContratosHTML(contratos);
                    muestraCliente.innerHTML = contenidoHTML;

                    const botonNuevoAnimal = muestraCliente.querySelector('[data-action="abrir-modal-animal"]');
                    botonNuevoAnimal?.addEventListener("click", () => {
                        mostrarFormularioAnimal(id_cliente);
                    });

                    muestraCliente.querySelectorAll('[data-action="editar-animal"]').forEach(boton => {
                        boton.addEventListener("click", () => {
                            const idAnimal = Number(boton.dataset.idAnimal);
                            mostrarFormularioEdicionAnimal(idAnimal);
                        });
                    });
                });
        })
        .catch(error => console.error("🚨 Error al obtener detalles del cliente:", error));
}

function agregarCliente(event) {
    event.preventDefault();
    limpiarErrorClienteFormulario();
    const valorCampo = id => document.getElementById(id)?.value.trim() ?? "";
    const valorOpcional = id => {
        const valor = valorCampo(id);
        return valor.length ? valor : null;
    };

    const nombre = valorCampo("nombre");
    if (!nombre) {
        mostrarErrorClienteFormulario("El campo 'nombre' es obligatorio.");
        return;
    }

    const apellidos = valorOpcional("apellidos");
    const calle = valorOpcional("calle");
    const piso = valorOpcional("piso");
    const codigo_postal = valorOpcional("codigo_postal");
    const municipio = valorOpcional("municipio");
    const pais = valorOpcional("pais");
    const telefono = valorOpcional("telefono");
    const email = valorOpcional("email");
    const nacionalidad = valorOpcional("nacionalidad");
    const idioma = valorOpcional("idioma");
    const genero = valorOpcional("genero");
    const referencia_origen = valorOpcional("referencia_origen");
    const whatsappAvatarInput = document.getElementById('whatsapp_avatar');
    const avatarArchivo = whatsappAvatarInput?.files?.[0] ?? null;

    const errorAvatar = validarArchivoAvatar(avatarArchivo);
    if (errorAvatar) {
        mostrarErrorClienteFormulario(errorAvatar);
        return;
    }

    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.href = "/";
        return;
    }

    const formData = new FormData();
    formData.append("nombre", nombre);
    if (apellidos !== null) formData.append("apellidos", apellidos);
    if (calle !== null) formData.append("calle", calle);
    if (piso !== null) formData.append("piso", piso);
    if (codigo_postal !== null) formData.append("codigo_postal", codigo_postal);
    if (municipio !== null) formData.append("municipio", municipio);
    if (pais !== null) formData.append("pais", pais);
    if (telefono !== null) formData.append("telefono", telefono);
    if (email !== null) formData.append("email", email);
    if (nacionalidad !== null) formData.append("nacionalidad", nacionalidad);
    if (idioma !== null) formData.append("idioma", idioma);
    if (genero !== null) formData.append("genero", genero);
    if (referencia_origen !== null) formData.append("referencia_origen", referencia_origen);
    if (avatarArchivo) {
        formData.append("whatsapp_avatar", avatarArchivo);
    }

    fetch('/api/clientes', {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${token}`
        },
        body: formData
    }).then(async response => {
        let data = {};
        try {
            data = await response.json();
        } catch (_) {
            data = {};
        }
        if (!response.ok) {
            throw new Error(data?.mensaje || data?.message || "No se pudo crear el cliente.");
        }
        cargarClientes();
        cerrarModalCliente();
    }).catch(error => {
        console.error("🚨 Error al crear cliente:", error);
        mostrarErrorClienteFormulario(obtenerMensajeError(error, "No se pudo crear el cliente."));
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

function construirContratosHTML(contratos) {
    let html = `
        <div class="cliente-section cliente-contracts">
            <p class="cliente-section-title">Contratos</p>
    `;

    if (!Array.isArray(contratos) || contratos.length === 0) {
        html += `<p class="cliente-empty">Este cliente no tiene contratos registrados.</p></div>`;
        return html;
    }

    const contratosOrdenados = [...contratos].sort((a, b) => (Number(b.id_contrato) || 0) - (Number(a.id_contrato) || 0));
    html += `<div class="cliente-contracts-grid">`;
    contratosOrdenados.forEach(contrato => {
        html += construirContratoCard(contrato);
    });
    html += `</div></div>`;
    return html;
}

function construirContratoCard(contrato) {
    if (!contrato) return "";
    const avatarCliente = clienteDetalleActual?.whatsapp_avatar || null;
    const nombreCliente = `${clienteDetalleActual?.nombre ?? ""}${clienteDetalleActual?.apellidos ? ` ${clienteDetalleActual.apellidos}` : ""}`.trim();
    const avatarClienteHTML = avatarCliente
        ? construirAvatarClienteHTML(avatarCliente, nombreCliente, "cliente-whatsapp-avatar--contrato")
        : "";
    const contratoFinalizado = esContratoFinalizado(contrato);
    const horarioNormalizado = normalizarHorarioContrato(contrato.horario);
    const horarioHTML = renderHorarioContrato(horarioNormalizado);
    const totalVisitas = calcularTotalVisitasContrato(contrato);
    const visitasTotalesHTML = totalVisitas !== null ? `
        <p class="contrato-visitas-row">
            <span class="contrato-data-label">Totales</span>
            <span class="contrato-visitas-value">${totalVisitas}</span>
        </p>
    ` : "";
    const precioTarifa = Number(contrato.precio_tarifa);
    const tarifaConImporte = contrato.tarifa
        ? `${contrato.tarifa}${Number.isFinite(precioTarifa) ? ` (${precioTarifa.toFixed(2)} €)` : ""}`
        : "-";

    return `
        <div class="cliente-contract-card contrato-detalle-card">
            <div class="contrato-id ${contratoFinalizado ? "contrato-id--finalizado" : ""}">Contrato ${contrato.id_contrato ?? "-"}</div>
            <div class="contrato-detail-layout">
                ${avatarClienteHTML}
                <div class="contrato-detail-main">
                    <div class="contrato-sections">
                        <div class="contrato-section contrato-section-fechas">
                            <p class="contrato-section-title">Fechas</p>
                            <div class="contrato-fechas-pares">
                                <p class="contrato-fecha-item"><span class="contrato-data-label">Inicio</span>${contrato.fecha_inicio ?? "-"}</p>
                                <p class="contrato-fecha-item"><span class="contrato-data-label">Fin</span>${contrato.fecha_fin ?? "-"}</p>
                            </div>
                        </div>
                        <div class="contrato-section contrato-section-visitas">
                            <p class="contrato-section-title contrato-section-title--center">Visitas</p>
                            <div class="contrato-visitas-metricas">
                                ${visitasTotalesHTML}
                                <p class="contrato-visitas-row">
                                    <span class="contrato-data-label">Por día</span>
                                    <span class="contrato-visitas-value">${contrato.visitas ?? "-"}</span>
                                </p>
                            </div>
                            ${horarioHTML || `<p class="cliente-empty">Horario no definido</p>`}
                        </div>
                        <div class="contrato-section">
                            <p class="contrato-section-title">Tarifa</p>
                            <p>${tarifaConImporte}</p>
                        </div>
                        <div class="contrato-section">
                            <p class="contrato-section-title">Factura</p>
                            <p>${contrato.num_factura ?? "-"}</p>
                        </div>
                    </div>
                    <div class="contrato-payments">
                        ${crearPagoCard({ etiqueta: "Total", importe: contrato.total })}
                        ${crearPagoCard({ etiqueta: "Pagado", importe: contrato.pagado })}
                        ${crearPagoCard({ etiqueta: "Pendiente", importe: contrato.pendiente, esTotal: true })}
                    </div>
                    ${contrato.observaciones ? `
                        <div class="contrato-section contrato-observaciones">
                            <p class="contrato-section-title">Observaciones</p>
                            <p>${contrato.observaciones}</p>
                        </div>
                    ` : ""}
                </div>
            </div>
            <div class="contrato-detail-actions">
                <button type="button" onclick="mostrarFormularioEdicionContrato(${Number(contrato.id_contrato) || 0})">Modificar</button>
            </div>
        </div>
    `;
}

function construirAnimalesHTML(animales) {
    const idCliente = Number(clienteDetalleActual?.id_cliente) || 0;
    const botonNuevoAnimal = idCliente > 0
        ? `<button type="button" class="btn-principal" data-action="abrir-modal-animal" data-id-cliente="${idCliente}">Añadir animal</button>`
        : "";

    let html = `
        <div class="cliente-section cliente-animals">
            <div class="cliente-section-header">
                <p class="cliente-section-title">Animales</p>
                ${botonNuevoAnimal}
            </div>
    `;

    if (Array.isArray(animales) && animales.length > 0) {
        html += `<div class="cliente-animals-grid">`;
        animales.forEach(animal => {
            const clasesAnimal = animal.fallecido ? "animal animal--fallecido" : "animal";
            const badgeFallecido = animal.fallecido
                ? `<p class="entity-status-badge entity-status-badge--fallecido">Fallecido</p>`
                : "";
            html += `
                <div class="${clasesAnimal}">
                    <div class="animal-content">
                        <div class="detalles">
                            <p><span class="nombreAnimal">${animal.nombre_animal}</span></p>
                            ${badgeFallecido}
                            <p><span class="cliente-label">Tipo</span>${animal.tipo_animal ?? "Sin tipo"}</p>
                            <p><span class="cliente-label">Sexo</span>${formatearSexoAnimal(animal.sexo)}</p>
                            <p><span class="cliente-label">Edad</span>${formatearEdadDesdeAnioNacimiento(animal.edad)}</p>
                            ${construirBloqueMedicacionAnimal(animal.medicacion)}
                        </div>
                        <div class="contrato-foto">
                            ${animal.foto ? `<img src="${animal.foto}" alt="Foto de ${animal.nombre_animal}">` : "No hay foto disponible"}
                        </div>
                    </div>
                    <div class="contrato-detail-actions">
                        <button type="button" data-action="editar-animal" data-id-animal="${Number(animal.id_animal) || 0}">Modificar</button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    } else {
        html += `<p class="cliente-empty">No hay animales registrados.</p>`;
    }

    html += `</div>`;
    return html;
}

function construirContactosAdicionalesHTML(contactos) {
    const contactosNormalizados = Array.isArray(contactos) ? contactos.filter(Boolean) : [];

    let html = `
        <div class="cliente-section cliente-contacts">
            <p class="cliente-section-title">Contactos adicionales</p>
    `;

    if (!contactosNormalizados.length) {
        html += `<p class="cliente-empty">No hay contactos adicionales registrados.</p></div>`;
        return html;
    }

    html += `<div class="cliente-contacts-grid">`;
    contactosNormalizados.forEach(contacto => {
        const nombreCompleto = `${contacto.nombre ?? ""}${contacto.apellidos ? ` ${contacto.apellidos}` : ""}`.trim();
        html += `
            <div class="cliente-contact-card">
                <p class="cliente-contact-name">${escaparHTML(nombreCompleto || "Sin nombre")}</p>
                <p><span class="cliente-label">Teléfono</span>${escaparHTML(contacto.telefono || "-")}</p>
                <p><span class="cliente-label">Email</span>${escaparHTML(contacto.email || "-")}</p>
            </div>
        `;
    });
    html += `</div></div>`;
    return html;
}

function cargarTarifasContrato() {
    fetchAPI('/api/tarifas')
        .then(tarifas => {
            tarifasContrato = (tarifas ?? [])
                .map(tarifa => ({
                    ...tarifa,
                    id_tarifa: Number(tarifa.id_tarifa),
                    precio_base: tarifa.precio_base !== undefined && tarifa.precio_base !== null
                        ? parseFloat(tarifa.precio_base)
                        : NaN
                }))
                .sort((a, b) => a.id_tarifa - b.id_tarifa);
            poblarSelectTarifasContrato();
        })
        .catch(error => {
            console.error("Error cargando tarifas de contrato:", error);
            tarifasContrato = [];
            poblarSelectTarifasContrato();
        });
}

function poblarSelectTarifasContrato() {
    tarifaSelect = tarifaSelect || document.getElementById("tarifa_contrato");
    if (!tarifaSelect) return;

    tarifaSelect.innerHTML = "";

    if (!tarifasContrato.length) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No hay tarifas disponibles";
        option.disabled = true;
        option.selected = true;
        tarifaSelect.appendChild(option);
        tarifaSelect.disabled = true;
        return;
    }

    tarifaSelect.disabled = false;

    tarifasContrato.forEach((tarifa, index) => {
        const option = document.createElement("option");
        option.value = String(tarifa.id_tarifa);
        const precio = Number.isFinite(tarifa.precio_base) ? ` - ${tarifa.precio_base.toFixed(2)} €` : "";
        option.textContent = `${tarifa.id_tarifa} · ${tarifa.descripcion}${precio}`;
        if (index === 0) {
            option.selected = true;
        }
        tarifaSelect.appendChild(option);
    });

    manejarCambioTarifa();
}

function restablecerTarifaContrato() {
    tarifaSelect = tarifaSelect || document.getElementById("tarifa_contrato");
    if (!tarifaSelect || tarifaSelect.options.length === 0) return;
    tarifaSelect.selectedIndex = 0;
    manejarCambioTarifa();
}

function obtenerTarifaSeleccionada() {
    tarifaSelect = tarifaSelect || document.getElementById("tarifa_contrato");
    if (!tarifaSelect) return null;
    if (!tarifaSelect.value) return null;
    const idSeleccionado = Number(tarifaSelect.value);
    if (Number.isNaN(idSeleccionado)) return null;
    return tarifasContrato.find(tarifa => Number(tarifa.id_tarifa) === idSeleccionado) || null;
}

function manejarCambioTarifa() {
    if (tarifaSelect && tarifaSelect.classList.contains("campo-error") && tarifaSelect.value) {
        tarifaSelect.classList.remove("campo-error");
    }
    const totalVisitas = parseFloat(document.getElementById("numero_visitas_totales")?.value ?? "");
    actualizarTotalContratoDesdeVisitas(totalVisitas);
}

function mostrarFormularioContrato(idCliente, nombreCliente = "") {
    if (!contratoModal || !contratoForm) {
        console.warn("Modal de contrato no disponible");
        return;
    }

    idClienteContrato = idCliente;
    contratoEnEdicionId = null;
    contratoForm.reset();
    limpiarErroresContrato();
    const modalTitle = document.getElementById("contrato-modal-title");
    const submitBtn = contratoForm.querySelector("button[type='submit']");
    const resumenDias = document.getElementById("numero_dias_resumen");
    const totalVisitasInput = document.getElementById("numero_visitas_totales");
    const numeroFacturaResumen = document.getElementById("numero_factura_resumen");
    const mitadTotalResumen = document.getElementById("mitad_total_resumen");
    if (resumenDias) {
        resumenDias.textContent = "Días calculados: 0";
    }
    if (totalVisitasInput) {
        totalVisitasInput.value = "";
    }
    const totalContratoInput = document.getElementById("total_contrato");
    const pagadoInput = document.getElementById("pagado");
    if (numeroFacturaResumen) {
        numeroFacturaResumen.textContent = `Número de factura: Se asignará al guardar (?-${idCliente})`;
    }
    if (modalTitle) modalTitle.textContent = "Nuevo contrato";
    if (submitBtn) submitBtn.textContent = "Guardar contrato";
    if (totalContratoInput) totalContratoInput.value = "0.00";
    if (pagadoInput) pagadoInput.value = "0.00";
    if (mitadTotalResumen) mitadTotalResumen.textContent = "50% del total: 0,00 €";
    if (contratoModalCliente) {
        contratoModalCliente.textContent = nombreCliente;
        contratoModalCliente.hidden = !nombreCliente;
    }
    restablecerTarifaContrato();
    sincronizarFechaFinConInicio();
    abrirModalContrato();
}

function mostrarFormularioEdicionContrato(idContrato) {
    if (!contratoModal || !contratoForm) return;
    const contrato = contratosClienteActuales.find(item => Number(item?.id_contrato) === Number(idContrato));
    if (!contrato) {
        alert("No se pudo cargar el contrato para editar.");
        return;
    }
    if (!clienteDetalleActual?.id_cliente) {
        alert("No hay cliente seleccionado.");
        return;
    }

    idClienteContrato = clienteDetalleActual.id_cliente;
    contratoEnEdicionId = Number(idContrato);
    contratoForm.reset();
    limpiarErroresContrato();

    const modalTitle = document.getElementById("contrato-modal-title");
    const submitBtn = contratoForm.querySelector("button[type='submit']");
    const numeroFacturaResumen = document.getElementById("numero_factura_resumen");
    const mitadTotalResumen = document.getElementById("mitad_total_resumen");
    const resumenDias = document.getElementById("numero_dias_resumen");

    const fechaInicioInput = document.getElementById("fecha_inicio");
    const fechaFinInput = document.getElementById("fecha_fin");
    const visitasDiariasInput = document.getElementById("numero_visitas_diarias");
    const totalVisitasInput = document.getElementById("numero_visitas_totales");
    const totalContratoInput = document.getElementById("total_contrato");
    const pagadoInput = document.getElementById("pagado");
    const horaMananaInput = document.getElementById("hora_manana");
    const horaTardeInput = document.getElementById("hora_tarde");
    const observacionesInput = document.getElementById("observaciones");

    if (modalTitle) modalTitle.textContent = "Modificar contrato";
    if (submitBtn) submitBtn.textContent = "Guardar cambios";
    if (numeroFacturaResumen) {
        numeroFacturaResumen.textContent = `Número de factura: ${contrato.num_factura ?? "-"}`;
    }

    const fechaInicio = convertirFechaDisplayAInput(contrato.fecha_inicio);
    const fechaFin = convertirFechaDisplayAInput(contrato.fecha_fin);
    if (fechaInicioInput) fechaInicioInput.value = fechaInicio;
    if (fechaFinInput) fechaFinInput.value = fechaFin;
    sincronizarFechaFinConInicio();
    if (visitasDiariasInput) visitasDiariasInput.value = contrato.visitas ?? "";

    const dias = calcularDiasEntre(fechaInicio, fechaFin);
    if (resumenDias) resumenDias.textContent = `Días calculados: ${dias}`;
    if (totalVisitasInput) {
        if (contrato.num_total_visitas !== undefined && contrato.num_total_visitas !== null && String(contrato.num_total_visitas).trim() !== "") {
            totalVisitasInput.value = String(contrato.num_total_visitas);
        } else if (dias > 0 && Number(contrato.visitas) > 0) {
            totalVisitasInput.value = Math.round(Number(contrato.visitas) * dias);
        } else {
            totalVisitasInput.value = "";
        }
    }

    if (tarifaSelect && contrato.id_tarifa !== undefined && contrato.id_tarifa !== null) {
        tarifaSelect.value = String(contrato.id_tarifa);
    }

    const horario = normalizarHorarioContrato(contrato.horario) || {};
    if (horaMananaInput) horaMananaInput.value = horario.Mañana || "";
    if (horaTardeInput) horaTardeInput.value = horario.Tarde || "";

    if (totalContratoInput) totalContratoInput.value = Number(contrato.total || 0).toFixed(2);
    if (pagadoInput) pagadoInput.value = Number(contrato.pagado || 0).toFixed(2);
    if (observacionesInput) observacionesInput.value = contrato.observaciones || "";
    if (mitadTotalResumen) actualizarMitadTotalContrato();

    if (contratoModalCliente) {
        const nombreCompleto = `${clienteDetalleActual?.nombre ?? ""}${clienteDetalleActual?.apellidos ? ` ${clienteDetalleActual.apellidos}` : ""}`.trim();
        contratoModalCliente.textContent = nombreCompleto;
        contratoModalCliente.hidden = !nombreCompleto;
    }

    abrirModalContrato();
}

function mostrarFormularioEdicionCliente() {
    if (!clienteDetalleActual) return;
    const muestraCliente = document.getElementById("muestra-cliente");
    if (!muestraCliente) return;

    const cliente = clienteDetalleActual;
    const genero = cliente.genero ?? "";
    const generoOptions = `
        <option value="" ${!genero ? "selected" : ""}>Sin especificar</option>
        <option value="M" ${genero === "M" ? "selected" : ""}>M</option>
        <option value="F" ${genero === "F" ? "selected" : ""}>F</option>
    `;

    muestraCliente.innerHTML = `
        <div class="cliente-detalle-card cliente-edit-card">
            <div class="cliente-edit-header">
                <h3 class="cliente-edit-title">Modificar cliente</h3>
                <p class="cliente-id-info">ID Cliente: ${cliente.id_cliente}</p>
            </div>
            <form id="form-editar-cliente" class="cliente-edit-form" novalidate>
                <div id="form-editar-cliente-error" class="modal-error" role="alert" aria-live="assertive" hidden></div>
                <div class="form-columns">
                    <div class="form-column">
                        <label for="edit_nombre">Nombre</label>
                        <input type="text" id="edit_nombre" value="${escaparHTML(cliente.nombre ?? "")}" required>
                        <label for="edit_apellidos">Apellidos</label>
                        <input type="text" id="edit_apellidos" value="${escaparHTML(cliente.apellidos ?? "")}">
                        <label for="edit_calle">Calle</label>
                        <input type="text" id="edit_calle" value="${escaparHTML(cliente.calle ?? "")}">
                        <label for="edit_piso">Piso</label>
                        <input type="text" id="edit_piso" value="${escaparHTML(cliente.piso ?? "")}">
                        <label for="edit_codigo_postal">Código Postal</label>
                        <input type="text" id="edit_codigo_postal" value="${escaparHTML(cliente.codigo_postal ?? "")}">
                        <label for="edit_municipio">Municipio / Barrio</label>
                        <input type="text" id="edit_municipio" value="${escaparHTML(cliente.municipio ?? "")}">
                        <label for="edit_pais">País</label>
                        <input type="text" id="edit_pais" value="${escaparHTML(cliente.pais ?? "")}">
                    </div>
                    <div class="form-column">
                        <label for="edit_telefono">Teléfono</label>
                        <input type="text" id="edit_telefono" value="${escaparHTML(cliente.telefono ?? "")}">
                        <label for="edit_email">Correo electrónico</label>
                        <input type="email" id="edit_email" value="${escaparHTML(cliente.email ?? "")}">
                        <label for="edit_nacionalidad">Nacionalidad</label>
                        <input type="text" id="edit_nacionalidad" value="${escaparHTML(cliente.nacionalidad ?? "")}">
                        <label for="edit_idioma">Idioma</label>
                        <input type="text" id="edit_idioma" value="${escaparHTML(cliente.idioma ?? "")}">
                        <label for="edit_genero">Género</label>
                        <select id="edit_genero">
                            ${generoOptions}
                        </select>
                        <label for="edit_referencia_origen">Referencia</label>
                        <input type="text" id="edit_referencia_origen" value="${escaparHTML(cliente.referencia ?? "")}">
                        <label for="edit_whatsapp_avatar">Avatar grupo WhatsApp</label>
                        <input type="file" id="edit_whatsapp_avatar" accept="image/*">
                        ${cliente.whatsapp_avatar ? `
                            <div class="cliente-whatsapp-avatar-preview">
                                <img src="${cliente.whatsapp_avatar}" alt="Avatar actual de WhatsApp">
                            </div>
                        ` : `<p class="cliente-empty">Sin avatar cargado.</p>`}
                        <label class="cliente-checkbox">
                            <input type="checkbox" id="edit_eliminar_whatsapp_avatar">
                            Eliminar avatar actual
                        </label>
                    </div>
                </div>
                <div class="cliente-edit-actions">
                    <button class="btn-secundario" id="cancelar-edicion-cliente">Cancelar</button>
                    <button type="submit" class="btn-principal">Guardar cambios</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById("form-editar-cliente")?.addEventListener("submit", guardarCambiosCliente);
    document.getElementById("form-editar-cliente")?.addEventListener("input", limpiarErrorEdicionCliente);
    document.getElementById("cancelar-edicion-cliente")?.addEventListener("click", event => {
        event.preventDefault();
        obtenerDetallesCliente(cliente.id_cliente);
    });
}

function guardarCambiosCliente(event) {
    event.preventDefault();
    if (!clienteDetalleActual) return;
    limpiarErrorEdicionCliente();
    const form = event.target;

    const obtenerValor = id => form.querySelector(id)?.value.trim() ?? "";
    const valorOpcional = selector => {
        const valor = obtenerValor(selector);
        return valor.length ? valor : null;
    };

    const payload = {
        nombre: obtenerValor("#edit_nombre"),
        apellidos: valorOpcional("#edit_apellidos"),
        calle: valorOpcional("#edit_calle"),
        piso: valorOpcional("#edit_piso"),
        codigo_postal: valorOpcional("#edit_codigo_postal"),
        municipio: valorOpcional("#edit_municipio"),
        pais: valorOpcional("#edit_pais"),
        telefono: valorOpcional("#edit_telefono"),
        email: valorOpcional("#edit_email"),
        nacionalidad: valorOpcional("#edit_nacionalidad"),
        idioma: valorOpcional("#edit_idioma"),
        genero: (form.querySelector("#edit_genero")?.value || null),
        referencia_origen: valorOpcional("#edit_referencia_origen")
    };
    const avatarArchivo = form.querySelector("#edit_whatsapp_avatar")?.files?.[0] ?? null;
    const eliminarAvatar = Boolean(form.querySelector("#edit_eliminar_whatsapp_avatar")?.checked);

    const errorAvatar = validarArchivoAvatar(avatarArchivo);
    if (errorAvatar) {
        mostrarErrorEdicionCliente(errorAvatar);
        return;
    }

    const idCliente = Number(clienteDetalleActual.id_cliente);
    if (!Number.isFinite(idCliente) || idCliente <= 0) {
        mostrarErrorEdicionCliente("No se pudo identificar el cliente.");
        return;
    }

    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.href = "/";
        return;
    }

    fetchAPI(`/api/clientes/${idCliente}`, {
        method: "PUT",
        body: JSON.stringify({
            ...payload,
            eliminar_whatsapp_avatar: eliminarAvatar
        })
    })
        .then(async () => {
            if (avatarArchivo) {
                const formDataAvatar = new FormData();
                formDataAvatar.append("whatsapp_avatar", avatarArchivo);
                const responseAvatar = await fetch(`/api/clientes/${idCliente}/whatsapp_avatar`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    },
                    body: formDataAvatar
                });
                let dataAvatar = {};
                try {
                    dataAvatar = await responseAvatar.json();
                } catch (_) {
                    dataAvatar = {};
                }
                if (!responseAvatar.ok) {
                    throw new Error(dataAvatar?.mensaje || dataAvatar?.message || "No se pudo guardar el avatar.");
                }
            }
            obtenerDetallesCliente(idCliente);
        })
        .catch(error => {
            console.error("🚨 Error al actualizar cliente:", error);
            mostrarErrorEdicionCliente(obtenerMensajeError(error, "No se pudo actualizar el cliente."));
        });
}

function inicializarModalAnimal() {
    animalModal = document.getElementById("animal-modal");
    if (!animalModal) return;

    animalForm = document.getElementById("form-animal-cliente");
    animalModalCliente = document.getElementById("animal-modal-cliente");
    const closeTriggers = animalModal.querySelectorAll("[data-close-animal-modal]");

    closeTriggers.forEach(trigger => {
        trigger.addEventListener("click", cerrarModalAnimal);
    });

    animalModal.addEventListener("click", event => {
        if (event.target === animalModal) {
            cerrarModalAnimal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && animalModal.classList.contains("is-active")) {
            cerrarModalAnimal();
        }
    });

    animalForm?.addEventListener("submit", gestionarEnvioAnimalCliente);
    animalForm?.addEventListener("input", () => limpiarErrorAnimalModal());
}

function mostrarFormularioAnimal(idCliente, nombreCliente = "") {
    if (!animalModal || !animalForm) {
        console.warn("Modal de animal no disponible");
        return;
    }

    const idNumerico = Number(idCliente);
    if (!Number.isFinite(idNumerico) || idNumerico <= 0) {
        alert("No se ha podido identificar el cliente para añadir el animal.");
        return;
    }

    idClienteAnimal = idNumerico;
    animalEnEdicionId = null;
    animalForm.reset();
    limpiarErrorAnimalModal();

    const modalTitle = document.getElementById("animal-modal-title");
    const submitBtn = animalForm.querySelector("button[type='submit']");
    const fotoInput = document.getElementById("animal_foto");
    const fallecidoInput = document.getElementById("animal_fallecido");
    if (modalTitle) modalTitle.textContent = "Nuevo animal";
    if (submitBtn) submitBtn.textContent = "Guardar animal";
    if (fotoInput) fotoInput.required = false;
    if (fallecidoInput) fallecidoInput.checked = false;

    const nombreClienteFinal = nombreCliente || `${clienteDetalleActual?.nombre ?? ""}${clienteDetalleActual?.apellidos ? ` ${clienteDetalleActual.apellidos}` : ""}`.trim();

    if (animalModalCliente) {
        animalModalCliente.textContent = nombreClienteFinal;
        animalModalCliente.hidden = !nombreClienteFinal;
    }

    establecerContenidoEditorMedicacion("animal_medicacion", "");
    abrirModalAnimal();
}

function mostrarFormularioEdicionAnimal(idAnimal) {
    if (!animalModal || !animalForm) return;

    const animal = animalesClienteActuales.find(item => Number(item?.id_animal) === Number(idAnimal));
    if (!animal) {
        alert("No se pudo cargar el animal para editar.");
        return;
    }

    const clienteId = Number(clienteDetalleActual?.id_cliente);
    if (!Number.isFinite(clienteId) || clienteId <= 0) {
        alert("No se ha podido identificar el cliente.");
        return;
    }

    idClienteAnimal = clienteId;
    animalEnEdicionId = Number(idAnimal);
    animalForm.reset();
    limpiarErrorAnimalModal();

    const modalTitle = document.getElementById("animal-modal-title");
    const submitBtn = animalForm.querySelector("button[type='submit']");
    if (modalTitle) modalTitle.textContent = "Modificar animal";
    if (submitBtn) submitBtn.textContent = "Guardar cambios";

    const nombreInput = document.getElementById("animal_nombre");
    const tipoInput = document.getElementById("animal_tipo");
    const sexoInput = document.getElementById("animal_sexo");
    const edadInput = document.getElementById("animal_edad");
    const medicacionInput = document.getElementById("animal_medicacion");
    const fallecidoInput = document.getElementById("animal_fallecido");

    if (nombreInput) nombreInput.value = animal.nombre_animal ?? animal.nombre ?? "";
    if (tipoInput) tipoInput.value = animal.tipo_animal ?? "";
    if (sexoInput) sexoInput.value = animal.sexo ?? "";
    if (edadInput) edadInput.value = animal.edad ?? "";
    if (fallecidoInput) fallecidoInput.checked = Boolean(animal.fallecido);
    if (medicacionInput) {
        establecerContenidoEditorMedicacion("animal_medicacion", animal.medicacion ?? "");
    }

    const nombreCliente = `${clienteDetalleActual?.nombre ?? ""}${clienteDetalleActual?.apellidos ? ` ${clienteDetalleActual.apellidos}` : ""}`.trim();
    if (animalModalCliente) {
        animalModalCliente.textContent = nombreCliente;
        animalModalCliente.hidden = !nombreCliente;
    }

    abrirModalAnimal();
}

function abrirModalAnimal() {
    if (!animalModal) return;
    animalModal.classList.add("is-active");
    animalModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const primerCampo = animalForm?.querySelector("input, select, textarea, [contenteditable='true']");
    if (primerCampo) {
        setTimeout(() => primerCampo.focus(), 50);
    }
}

function cerrarModalAnimal() {
    if (!animalModal) return;
    animalModal.classList.remove("is-active");
    animalModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    idClienteAnimal = null;
    animalEnEdicionId = null;
    limpiarErrorAnimalModal();
    establecerContenidoEditorMedicacion("animal_medicacion", "");
    if (animalModalCliente) {
        animalModalCliente.textContent = "";
        animalModalCliente.hidden = true;
    }
}

function limpiarErrorAnimalModal() {
    const errorBox = document.getElementById("form-animal-error");
    const nombreInput = document.getElementById("animal_nombre");
    if (nombreInput) {
        nombreInput.classList.remove("campo-error");
    }
    if (errorBox) {
        errorBox.textContent = "";
        errorBox.hidden = true;
    }
}

function mostrarErrorAnimalModal(mensaje) {
    const errorBox = document.getElementById("form-animal-error");
    if (!errorBox) return;
    errorBox.textContent = mensaje;
    errorBox.hidden = false;
}

async function gestionarEnvioAnimalCliente(event) {
    event.preventDefault();

    const clienteId = Number(idClienteAnimal);
    if (!Number.isFinite(clienteId) || clienteId <= 0) {
        mostrarErrorAnimalModal("No se ha seleccionado un cliente válido.");
        return;
    }

    limpiarErrorAnimalModal();

    const nombreInput = document.getElementById("animal_nombre");
    const tipoInput = document.getElementById("animal_tipo");
    const sexoInput = document.getElementById("animal_sexo");
    const edadInput = document.getElementById("animal_edad");
    const medicacionInput = document.getElementById("animal_medicacion");
    const fotoInput = document.getElementById("animal_foto");
    const fallecidoInput = document.getElementById("animal_fallecido");
    const fotoArchivo = fotoInput?.files?.[0] ?? null;
    const nombre = nombreInput?.value.trim() ?? "";
    const esEdicion = Number.isFinite(animalEnEdicionId) && animalEnEdicionId > 0;

    if (!nombre) {
        nombreInput?.classList.add("campo-error");
        mostrarErrorAnimalModal("El nombre del animal es obligatorio.");
        nombreInput?.focus();
        return;
    }

    const errorFoto = validarArchivoFotoAnimal(fotoArchivo);
    if (errorFoto) {
        mostrarErrorAnimalModal(errorFoto);
        return;
    }

    const token = sessionStorage.getItem("token");
    if (!token) {
        window.location.href = "/";
        return;
    }

    try {
        const formData = new FormData();
        formData.append("nombre", nombre);
        formData.append("tipo_animal", tipoInput?.value.trim() ?? "");
        formData.append("sexo", sexoInput?.value ?? "");
        formData.append("edad", edadInput?.value.trim() ?? "");
        formData.append("medicacion", obtenerContenidoEditorMedicacion("animal_medicacion"));
        formData.append("fallecido", fallecidoInput?.checked ? "true" : "false");
        if (fotoArchivo) {
            formData.append("foto", fotoArchivo);
        }

        if (esEdicion) {
            formData.append("eliminar_foto", "false");
            const response = await fetch(`/api/animales/${animalEnEdicionId}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.message || errorData?.mensaje || "No se pudo actualizar el animal.");
            }
            await response.json().catch(() => ({}));
        } else {
            formData.append("id_cliente", String(clienteId));
            const response = await fetch("/api/animales", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.message || errorData?.mensaje || "No se pudo crear el animal.");
            }

            await response.json().catch(() => ({}));
        }

        cerrarModalAnimal();
        await obtenerDetallesCliente(clienteId);
    } catch (error) {
        const accion = esEdicion ? "actualizar" : "crear";
        console.error(`🚨 Error al ${accion} animal:`, error);
        mostrarErrorAnimalModal(error?.message || `No se pudo ${accion} el animal. Inténtalo de nuevo.`);
    }
}

window.mostrarFormularioAnimal = mostrarFormularioAnimal;
window.mostrarFormularioEdicionAnimal = mostrarFormularioEdicionAnimal;

function inicializarModalContrato() {
    contratoModal = document.getElementById("contrato-modal");
    if (!contratoModal) return;

    contratoForm = document.getElementById("form-contrato");
    contratoModalCliente = document.getElementById("contrato-modal-cliente");
    tarifaSelect = document.getElementById("tarifa_contrato");
    const closeTriggers = contratoModal.querySelectorAll("[data-close-modal]");

    closeTriggers.forEach(trigger => {
        trigger.addEventListener("click", cerrarModalContrato);
    });

    contratoModal.addEventListener("click", event => {
        if (event.target === contratoModal) {
            cerrarModalContrato();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && contratoModal.classList.contains("is-active")) {
            cerrarModalContrato();
        }
    });

    if (contratoForm) {
        contratoForm.addEventListener("submit", gestionarEnvioContrato);
        contratoForm.addEventListener("input", manejarInputContrato);
    }
    tarifaSelect?.addEventListener("change", manejarCambioTarifa);

    const fechaInicioInput = document.getElementById("fecha_inicio");
    const fechaFinInput = document.getElementById("fecha_fin");
    const visitasDiariasInput = document.getElementById("numero_visitas_diarias");
    const visitasTotalesInput = document.getElementById("numero_visitas_totales");
    const totalContratoInput = document.getElementById("total_contrato");

    fechaInicioInput?.addEventListener("change", () => {
        sincronizarFechaFinConInicio();
        actualizarNumeroVisitasTotales();
    });
    fechaFinInput?.addEventListener("change", actualizarNumeroVisitasTotales);
    visitasDiariasInput?.addEventListener("input", actualizarNumeroVisitasTotales);
    visitasTotalesInput?.addEventListener("input", () => {
        const total = parseFloat(visitasTotalesInput.value);
        actualizarTotalContratoDesdeVisitas(total);
    });
    totalContratoInput?.addEventListener("input", actualizarMitadTotalContrato);
}

function sincronizarFechaFinConInicio() {
    const fechaInicioInput = document.getElementById("fecha_inicio");
    const fechaFinInput = document.getElementById("fecha_fin");
    if (!fechaInicioInput || !fechaFinInput) return;

    const fechaInicio = fechaInicioInput.value;
    if (!fechaInicio) {
        fechaFinInput.removeAttribute("min");
        return;
    }

    fechaFinInput.min = fechaInicio;
    if (!fechaFinInput.value || fechaFinInput.value < fechaInicio) {
        fechaFinInput.value = fechaInicio;
    }
}

function abrirModalContrato() {
    if (!contratoModal) return;
    contratoModal.classList.add("is-active");
    contratoModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const primerCampo = contratoForm?.querySelector("input, select, textarea");
    if (primerCampo) {
        setTimeout(() => primerCampo.focus(), 50);
    }
}

function cerrarModalContrato() {
    if (!contratoModal) return;
    contratoModal.classList.remove("is-active");
    contratoModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    idClienteContrato = null;
    contratoEnEdicionId = null;
    if (contratoModalCliente) {
        contratoModalCliente.textContent = "";
        contratoModalCliente.hidden = true;
    }
}

function manejarInputContrato(event) {
    if (!contratoForm) return;
    const campo = event.target;
    if (campo.classList.contains("campo-error") && campo.value.trim()) {
        campo.classList.remove("campo-error");
    }
    const errorBox = document.getElementById("form-contrato-error");
    if (errorBox && !contratoForm.querySelector(".campo-error")) {
        errorBox.textContent = "";
        errorBox.hidden = true;
    }
}

function limpiarErroresContrato() {
    CAMPOS_OBLIGATORIOS_CONTRATO.forEach(({ id }) => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.classList.remove("campo-error");
        }
    });
    const errorBox = document.getElementById("form-contrato-error");
    if (errorBox) {
        errorBox.textContent = "";
        errorBox.hidden = true;
    }
}

function mostrarErroresContrato(errores) {
    const errorBox = document.getElementById("form-contrato-error");
    if (!errorBox) return;
    const lista = errores.map(error => `<li>${error}</li>`).join("");
    errorBox.innerHTML = `<p>Completa los siguientes campos obligatorios:</p><ul>${lista}</ul>`;
    errorBox.hidden = false;
}

function mostrarErrorContrato(mensaje) {
    const errorBox = document.getElementById("form-contrato-error");
    if (!errorBox) return;
    errorBox.textContent = mensaje;
    errorBox.hidden = false;
}

function calcularDiasEntre(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) return 0;
    const inicio = crearFechaUTCDesdeInput(fechaInicio);
    const fin = crearFechaUTCDesdeInput(fechaFin);
    return calcularDiasCalendario(inicio, fin);
}

function actualizarNumeroVisitasTotales() {
    const fechaInicio = document.getElementById("fecha_inicio")?.value;
    const fechaFin = document.getElementById("fecha_fin")?.value;
    const visitasDiariasInput = document.getElementById("numero_visitas_diarias");
    const totalVisitasInput = document.getElementById("numero_visitas_totales");
    const resumenDias = document.getElementById("numero_dias_resumen");

    if (!visitasDiariasInput || !totalVisitasInput) return;

    const dias = calcularDiasEntre(fechaInicio, fechaFin);
    if (resumenDias) {
        resumenDias.textContent = `Días calculados: ${dias}`;
    }

    const visitasDiarias = parseFloat(String(visitasDiariasInput.value).replace(",", "."));
    if (!isNaN(visitasDiarias) && visitasDiarias > 0 && dias > 0) {
        const total = Math.round(visitasDiarias * dias);
        totalVisitasInput.value = total;
        actualizarTotalContratoDesdeVisitas(total);
        return;
    }

    totalVisitasInput.value = "";
    actualizarTotalContratoDesdeVisitas(NaN);
}

function actualizarTotalContratoDesdeVisitas(totalVisitas) {
    const totalContratoInput = document.getElementById("total_contrato");
    if (!totalContratoInput) return;
    const total = parseFloat(totalVisitas);
    const tarifaSeleccionada = obtenerTarifaSeleccionada();
    const precioTarifa = tarifaSeleccionada ? parseFloat(tarifaSeleccionada.precio_base) : NaN;

    if (!isNaN(total) && total >= 0 && !isNaN(precioTarifa) && precioTarifa >= 0) {
        totalContratoInput.value = (total * precioTarifa).toFixed(2);
        actualizarMitadTotalContrato();
        return;
    }

    totalContratoInput.value = "0.00";
    actualizarMitadTotalContrato();
}

function actualizarMitadTotalContrato() {
    const totalContratoInput = document.getElementById("total_contrato");
    const total = parseFloat(String(totalContratoInput?.value ?? "").replace(",", "."));
    const mitadTotal = Number.isNaN(total) ? 0 : total / 2;
    const mitadTotalResumen = document.getElementById("mitad_total_resumen");
    if (mitadTotalResumen) {
        mitadTotalResumen.textContent = `50% del total: ${mitadTotal.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    }
}

function gestionarEnvioContrato(event) {
    event.preventDefault();
    if (!idClienteContrato) {
        console.error("No se ha seleccionado un cliente para el contrato");
        return;
    }

    limpiarErroresContrato();

    const errores = [];
    let primerCampoErroneo = null;

    CAMPOS_OBLIGATORIOS_CONTRATO.forEach(({ id, nombre }) => {
        const campo = document.getElementById(id);
        if (campo && !campo.value.trim()) {
            campo.classList.add("campo-error");
            errores.push(nombre);
            if (!primerCampoErroneo) {
                primerCampoErroneo = campo;
            }
        }
    });

    if (errores.length > 0) {
        mostrarErroresContrato(errores);
        if (primerCampoErroneo) {
            primerCampoErroneo.focus();
        }
        return;
    }

    const fecha_inicio = document.getElementById("fecha_inicio").value;
    const fecha_fin = document.getElementById("fecha_fin").value;
    const numero_visitas_diarias = document.getElementById("numero_visitas_diarias").value.trim();
    const num_total_visitas = document.getElementById("numero_visitas_totales").value.trim();
    const total = document.getElementById("total_contrato").value.trim();
    const pagado = document.getElementById("pagado").value.trim() || "0";
    const hora_manana = document.getElementById("hora_manana").value;
    const hora_tarde = document.getElementById("hora_tarde").value;
    const id_tarifa = parseInt(document.getElementById("tarifa_contrato").value, 10);
    const observaciones = document.getElementById("observaciones").value.trim();

    const horario_visitas = {};
    if (hora_manana) horario_visitas["Mañana"] = hora_manana;
    if (hora_tarde) horario_visitas["Tarde"] = hora_tarde;

    const clienteId = idClienteContrato;

    const esEdicion = Number.isFinite(contratoEnEdicionId) && contratoEnEdicionId > 0;
    const endpoint = esEdicion ? `/api/contratos/${contratoEnEdicionId}` : "/api/contratos";
    const method = esEdicion ? "PUT" : "POST";
    const payload = {
        fecha_inicio,
        fecha_fin,
        numero_visitas_diarias,
        num_total_visitas,
        horario_visitas,
        total,
        pagado,
        id_tarifa,
        observaciones
    };
    if (!esEdicion) {
        payload.id_cliente = clienteId;
    }

    fetchAPI(endpoint, {
        method,
        body: JSON.stringify(payload)
    }).then((respuesta) => {
        if (esEdicion) {
            alert("Contrato actualizado correctamente.");
        } else {
            const numFactura = respuesta?.num_factura ? ` Factura: ${respuesta.num_factura}.` : "";
            alert(`Contrato creado correctamente.${numFactura}`);
        }
        cerrarModalContrato();
        obtenerDetallesCliente(clienteId);
    }).catch(error => {
        const accion = esEdicion ? "actualizar" : "crear";
        console.error(`🚨 Error al ${accion} contrato:`, error);
        mostrarErrorContrato(obtenerMensajeError(error, `No se pudo ${accion} el contrato.`));
    });
}
