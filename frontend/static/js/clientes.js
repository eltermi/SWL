/* Contenido base para clientes.js */
let contratoModal = null;
let contratoForm = null;
let idClienteContrato = null;
let tarifasContrato = [];
let tarifaSelect = null;

const CAMPOS_OBLIGATORIOS_CONTRATO = [
    { id: "fecha_inicio", nombre: "Fecha de inicio" },
    { id: "fecha_fin", nombre: "Fecha de fin" },
    { id: "numero_visitas_diarias", nombre: "Número de visitas diarias" },
    { id: "tarifa_contrato", nombre: "Tarifa del contrato" },
    { id: "pago_adelantado", nombre: "Pago 1 (€)" },
    { id: "pago_final", nombre: "Pago 2 (€)" }
];
const MS_POR_DIA = 24 * 60 * 60 * 1000;

document.addEventListener('DOMContentLoaded', function () {
    cargarClientes();
    document.getElementById('cliente-form').addEventListener('submit', agregarCliente);
    document.getElementById('buscar').addEventListener('input', buscarClientes);
    inicializarModalContrato();
    cargarTarifasContrato();
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

function formatearImporte(valor) {
    if (valor === undefined || valor === null || valor === "") return "-";
    const numero = Number(valor);
    if (Number.isNaN(numero)) return "-";
    return numero.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function crearPagoCard({ etiqueta, importe, estado, esTotal = false }) {
    const importeFormateado = formatearImporte(importe);
    if (esTotal) {
        return `
            <div class="pago-card pago-card-total">
                <span class="pago-label">${etiqueta}</span>
                <strong>${importeFormateado}</strong>
            </div>
        `;
    }

    const estadoTexto = estado ?? "Sin estado";
    const estadoSlug = ((estadoTexto || "")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")) || "sin-estado";

    return `
        <div class="pago-card">
            <span class="pago-label">${etiqueta}</span>
            <strong>${importeFormateado}</strong>
            <span class="pago-estado pago-estado--${estadoSlug}">${estadoTexto}</span>
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

    const manana = horario.Mañana ?? "-";
    const tarde = horario.Tarde ?? "-";

    return `
        <table class="tabla-horario">
            <thead>
                <tr><th>Mañana</th><th>Tarde</th></tr>
            </thead>
            <tbody>
                <tr><td>${manana}</td><td>${tarde}</td></tr>
            </tbody>
        </table>
    `;
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
                    <button class="btn-principal" onclick="mostrarFormularioContrato(${id_cliente})">Nuevo contrato</button>
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

    html += `<div class="cliente-contracts-grid">`;
    contratos.forEach(contrato => {
        html += construirContratoCard(contrato);
    });
    html += `</div></div>`;
    return html;
}

function construirContratoCard(contrato) {
    if (!contrato) return "";
    const horarioNormalizado = normalizarHorarioContrato(contrato.horario);
    const horarioHTML = renderHorarioContrato(horarioNormalizado);

    return `
        <div class="cliente-contract-card">
            <div class="cliente-contract-header">
                <p class="contrato-id">Contrato ${contrato.id_contrato ?? "-"}</p>
                ${contrato.tarifa ? `<span class="cliente-chip">${contrato.tarifa}</span>` : ""}
            </div>
            <div class="cliente-contract-columns">
                <div>
                    <p><span class="cliente-label">Inicio</span>${contrato.fecha_inicio ?? "-"}</p>
                    <p><span class="cliente-label">Fin</span>${contrato.fecha_fin ?? "-"}</p>
                    <p><span class="cliente-label">Visitas/día</span>${contrato.visitas ?? "-"}</p>
                </div>
                <div>
                    ${horarioHTML || `<p class="cliente-empty">Horario no definido</p>`}
                </div>
            </div>
            <div class="contrato-payments">
                ${crearPagoCard({ etiqueta: "Pago 1", importe: contrato.pago_adelantado, estado: contrato.estado_pago_adelantado })}
                ${crearPagoCard({ etiqueta: "Pago 2", importe: contrato.pago_final, estado: contrato.estado_pago_final })}
                ${crearPagoCard({ etiqueta: "Pago Total", importe: contrato.pago_total, esTotal: true })}
            </div>
            ${contrato.observaciones ? `<p class="cliente-contract-notes">${contrato.observaciones}</p>` : ""}
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
    const visitasTotalesInput = document.getElementById("numero_visitas_totales");
    if (!visitasTotalesInput) return;
    if (tarifaSelect && tarifaSelect.classList.contains("campo-error") && tarifaSelect.value) {
        tarifaSelect.classList.remove("campo-error");
    }
    const total = parseFloat(visitasTotalesInput.value);
    actualizarPagosDesdeVisitas(total);
}

function mostrarFormularioContrato(idCliente) {
    if (!contratoModal || !contratoForm) {
        console.warn("Modal de contrato no disponible");
        return;
    }

    idClienteContrato = idCliente;
    contratoForm.reset();
    limpiarErroresContrato();
    const resumenDias = document.getElementById("numero_dias_resumen");
    const totalVisitasInput = document.getElementById("numero_visitas_totales");
    if (resumenDias) {
        resumenDias.textContent = "Días calculados: 0";
    }
    if (totalVisitasInput) {
        totalVisitasInput.value = "";
    }
    const estadoPagoAdelantado = document.getElementById("estado_pago_adelantado");
    const estadoPagoFinal = document.getElementById("estado_pago_final");
    const pagoTotalInput = document.getElementById("pago_total");
    if (estadoPagoAdelantado) estadoPagoAdelantado.value = "Pendiente";
    if (estadoPagoFinal) estadoPagoFinal.value = "Pendiente";
    if (pagoTotalInput) pagoTotalInput.value = "";
    restablecerTarifaContrato();
    abrirModalContrato();
}

function inicializarModalContrato() {
    contratoModal = document.getElementById("contrato-modal");
    if (!contratoModal) return;

    contratoForm = document.getElementById("form-contrato");
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
    const pagoAdelantadoInput = document.getElementById("pago_adelantado");
    const pagoFinalInput = document.getElementById("pago_final");

    fechaInicioInput?.addEventListener("change", actualizarNumeroVisitasTotales);
    fechaFinInput?.addEventListener("change", actualizarNumeroVisitasTotales);
    visitasDiariasInput?.addEventListener("input", actualizarNumeroVisitasTotales);
    visitasTotalesInput?.addEventListener("input", () => {
        const total = parseFloat(visitasTotalesInput.value);
        actualizarPagosDesdeVisitas(total);
    });
    pagoAdelantadoInput?.addEventListener("input", actualizarPagoTotal);
    pagoFinalInput?.addEventListener("input", actualizarPagoTotal);
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

    const visitasDiarias = parseFloat(visitasDiariasInput.value);
    if (!isNaN(visitasDiarias) && visitasDiarias > 0 && dias > 0) {
        const total = Math.round(visitasDiarias * dias);
        totalVisitasInput.value = total;
        actualizarPagosDesdeVisitas(total);
    }
}

function actualizarPagosDesdeVisitas(totalVisitas) {
    const pagoAdelantadoInput = document.getElementById("pago_adelantado");
    const pagoFinalInput = document.getElementById("pago_final");
    if (!pagoAdelantadoInput || !pagoFinalInput) return;

    const total = parseFloat(totalVisitas);
    const tarifaSeleccionada = obtenerTarifaSeleccionada();
    const precioTarifa = tarifaSeleccionada ? parseFloat(tarifaSeleccionada.precio_base) : NaN;

    if (!isNaN(total) && total >= 0 && !isNaN(precioTarifa)) {
        const importeTotal = total * precioTarifa;
        const importeMitad = (importeTotal / 2).toFixed(2);
        pagoAdelantadoInput.value = importeMitad;
        pagoFinalInput.value = importeMitad;
        actualizarPagoTotal();
        return;
    }

    pagoAdelantadoInput.value = "";
    pagoFinalInput.value = "";
    actualizarPagoTotal();
}

function actualizarPagoTotal() {
    const pagoAdelantadoInput = document.getElementById("pago_adelantado");
    const pagoFinalInput = document.getElementById("pago_final");
    const pagoTotalInput = document.getElementById("pago_total");
    if (!pagoTotalInput) return;

    const valorPago1 = parseFloat(String(pagoAdelantadoInput?.value ?? "").replace(",", "."));
    const valorPago2 = parseFloat(String(pagoFinalInput?.value ?? "").replace(",", "."));
    const hayValorPago1 = Boolean(pagoAdelantadoInput?.value && pagoAdelantadoInput.value.trim().length);
    const hayValorPago2 = Boolean(pagoFinalInput?.value && pagoFinalInput.value.trim().length);

    if (!hayValorPago1 && !hayValorPago2) {
        pagoTotalInput.value = "";
        return;
    }

    const importe = (Number.isNaN(valorPago1) ? 0 : valorPago1) + (Number.isNaN(valorPago2) ? 0 : valorPago2);
    pagoTotalInput.value = importe.toFixed(2);
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
    const hora_manana = document.getElementById("hora_manana").value;
    const hora_tarde = document.getElementById("hora_tarde").value;
    const pago_adelantado = document.getElementById("pago_adelantado").value.trim();
    const estado_pago_adelantado = document.getElementById("estado_pago_adelantado").value;
    const pago_final = document.getElementById("pago_final").value.trim();
    const estado_pago_final = document.getElementById("estado_pago_final").value;
    const id_tarifa = parseInt(document.getElementById("tarifa_contrato").value, 10);
    const observaciones = document.getElementById("observaciones").value.trim();

    const horario_visitas = {};
    if (hora_manana) horario_visitas["Mañana"] = hora_manana;
    if (hora_tarde) horario_visitas["Tarde"] = hora_tarde;

    const clienteId = idClienteContrato;

    fetchAPI('/api/contratos', {
        method: 'POST',
        body: JSON.stringify({
            id_cliente: clienteId,
            fecha_inicio,
            fecha_fin,
            numero_visitas_diarias,
            horario_visitas,
            pago_adelantado,
            estado_pago_adelantado,
            pago_final,
            estado_pago_final,
            id_tarifa,
            observaciones
        })
    }).then(() => {
        alert("Contrato creado correctamente");
        cerrarModalContrato();
        obtenerDetallesCliente(clienteId);
    }).catch(error => {
        console.error("🚨 Error al crear contrato:", error);
        alert("Error al crear el contrato. Inténtalo de nuevo.");
    });
}
