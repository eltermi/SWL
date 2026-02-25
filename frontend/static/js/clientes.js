/* Contenido base para clientes.js */
let contratoModal = null;
let contratoForm = null;
let contratoModalCliente = null;
let idClienteContrato = null;
let clienteDetalleActual = null;
let contratoEnEdicionId = null;
let contratosClienteActuales = [];
let tarifasContrato = [];
let tarifaSelect = null;

const CAMPOS_OBLIGATORIOS_CONTRATO = [
    { id: "fecha_inicio", nombre: "Fecha de inicio" },
    { id: "fecha_fin", nombre: "Fecha de fin" },
    { id: "numero_visitas_diarias", nombre: "Número de visitas diarias" },
    { id: "numero_visitas_totales", nombre: "Número de visitas totales" },
    { id: "tarifa_contrato", nombre: "Tarifa del contrato" },
    { id: "pagado", nombre: "Pagado (€)" }
];
const MS_POR_DIA = 24 * 60 * 60 * 1000;

function escaparHTML(texto = "") {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

document.addEventListener('DOMContentLoaded', function () {
    cargarClientes();
    document.getElementById('cliente-form').addEventListener('submit', agregarCliente);
    document.getElementById('buscar').addEventListener('input', buscarClientes);
    enfocarBuscadorClientes();
    inicializarModalContrato();
    cargarTarifasContrato();
    procesarAccesoDirectoContrato();
});

function enfocarBuscadorClientes() {
    const buscador = document.getElementById('buscar');
    if (!buscador) return;
    requestAnimationFrame(() => buscador.focus());
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
    const inicio = parseFechaContrato(contrato.fecha_inicio);
    const fin = parseFechaContrato(contrato.fecha_fin);
    const visitasDiarias = Number(contrato.visitas);

    if (!inicio || !fin || Number.isNaN(visitasDiarias) || visitasDiarias <= 0) {
        return null;
    }

    const diferencia = fin.getTime() - inicio.getTime();
    if (diferencia < 0) return null;
    const dias = Math.floor(diferencia / MS_POR_DIA) + 1;
    return dias > 0 ? dias * visitasDiarias : null;
}

function cargarClientes(busqueda = "") {
    const container = document.getElementById("lista-clientes");
    const muestraCliente = document.getElementById("muestra-cliente");

    container.innerHTML = "";
    muestraCliente.innerHTML = "";
    muestraCliente.style.display = "none";
    document.getElementById("form-crea-cliente").style.display = "block";
    container.style.display = "block";
    clienteDetalleActual = null;

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
    return fetchAPI(`/api/clientes/${id_cliente}`)
        .then(cliente => {
            const container = document.getElementById("lista-clientes");
            const muestraCliente = document.getElementById("muestra-cliente");

            container.style.display = "none";
            muestraCliente.style.display = "block";
            document.getElementById("form-crea-cliente").style.display = "none";

            clienteDetalleActual = cliente;

            const nombreCompleto = `${cliente.nombre ?? ""}${cliente.apellidos ? " " + cliente.apellidos : ""}`.trim();
            const emailHTML = cliente.email
                ? `<p class="cliente-email"><a href="mailto:${cliente.email}">${cliente.email}</a></p>`
                : "";
            const contactoAlternativo = cliente.ad_nombre
                ? `
                        <div class="cliente-alt-contact">
                            <p class="cliente-label">Contacto alternativo</p>
                            <p class="cliente-alt-nombre">${cliente.ad_nombre}${cliente.ad_apellidos ? " " + cliente.ad_apellidos : ""}</p>
                            ${cliente.ad_telefono ? `<p class="cliente-alt-telefono">${cliente.ad_telefono}</p>` : ""}
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
                        <div class="cliente-main-contact">
                            <p class="cliente-nombre">${nombreCompleto}</p>
                            ${cliente.telefono ? `<p class="cliente-telefono">${cliente.telefono}</p>` : ""}
                            ${emailHTML}
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
                    contenidoHTML += construirContratosHTML(contratos);
                    contenidoHTML += construirAnimalesHTML(animales);
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
            <div class="contrato-id">Contrato ${contrato.id_contrato ?? "-"}</div>
            <div class="contrato-detail-layout">
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
    let html = `
        <div class="cliente-section cliente-animals">
            <p class="cliente-section-title">Animales</p>
    `;

    if (Array.isArray(animales) && animales.length > 0) {
        html += `<div class="cliente-animals-grid">`;
        animales.forEach(animal => {
            html += `
                <div class="animal">
                    <div class="animal-content">
                        <div class="detalles">
                            <p><span class="nombreAnimal">${animal.nombre_animal}</span></p>
                            <p><span class="cliente-label">Tipo</span>${animal.tipo_animal ?? "Sin tipo"}</p>
                            <p><span class="cliente-label">Edad</span>${animal.edad ?? "Sin edad"}</p>
                            <p><span class="cliente-label">Medicación</span>${animal.medicacion ?? "No hay medicación"}</p>
                        </div>
                        <div class="contrato-foto">
                            ${animal.foto ? `<img src="${animal.foto}" alt="Foto de ${animal.nombre_animal}">` : "No hay foto disponible"}
                        </div>
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
    document.getElementById("cancelar-edicion-cliente")?.addEventListener("click", event => {
        event.preventDefault();
        obtenerDetallesCliente(cliente.id_cliente);
    });
}

function guardarCambiosCliente(event) {
    event.preventDefault();
    if (!clienteDetalleActual) return;
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

    fetchAPI(`/api/clientes/${clienteDetalleActual.id_cliente}`, {
        method: "PUT",
        body: JSON.stringify(payload)
    })
        .then(() => {
            obtenerDetallesCliente(clienteDetalleActual.id_cliente);
        })
        .catch(error => {
            console.error("🚨 Error al actualizar cliente:", error);
            alert("No se pudo actualizar el cliente. Inténtalo de nuevo.");
        });
}

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

    fechaInicioInput?.addEventListener("change", actualizarNumeroVisitasTotales);
    fechaFinInput?.addEventListener("change", actualizarNumeroVisitasTotales);
    visitasDiariasInput?.addEventListener("input", actualizarNumeroVisitasTotales);
    visitasTotalesInput?.addEventListener("input", () => {
        const total = parseFloat(visitasTotalesInput.value);
        actualizarTotalContratoDesdeVisitas(total);
    });
    totalContratoInput?.addEventListener("input", actualizarMitadTotalContrato);
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

function calcularDiasEntre(fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) return 0;
    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(`${fechaFin}T00:00:00`);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return 0;
    const diferencia = fin.getTime() - inicio.getTime();
    if (diferencia < 0) return 0;
    return Math.floor(diferencia / MS_POR_DIA) + 1;
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
        alert(`Error al ${accion} el contrato. Inténtalo de nuevo.`);
    });
}
