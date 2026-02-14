document.addEventListener('DOMContentLoaded', function () {
    inicializarAccionesDashboard();
    getContratosActivos();
});

function inicializarAccionesDashboard() {
    const botonNuevoContrato = document.getElementById("btn-nuevo-contrato-dashboard");
    if (!botonNuevoContrato) return;
    botonNuevoContrato.addEventListener("click", () => {
        window.location.href = "/clientes";
    });
}

function getNombreDia(fechaTexto) {
    if (fechaTexto === "HOY" || fechaTexto === "MAÑANA") return "";
    const [day, month, year] = fechaTexto.split("-");
    const fecha = new Date(year, month - 1, day);
    return fecha.toLocaleDateString('es-ES', { weekday: 'long' }) + " ";
}

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
    }).catch(error => {
        console.error("🚨 Error en la API:", error);
        throw error;
    });
}

function formatearHorario(horario) {
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

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function parseFechaContrato(fechaTexto) {
    if (!fechaTexto || typeof fechaTexto !== "string") return null;
    const partes = fechaTexto.split("-");
    if (partes.length !== 3) return null;
    const [dia, mes, anio] = partes;
    const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function calcularTotalVisitas(contrato) {
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

function renderContratosProgramados(contratos, container) {
    if (!container) return;
    container.innerHTML = "";

    if (!Array.isArray(contratos) || contratos.length === 0) {
        container.innerHTML = `
            <div class="contratos-programados-card">
                <p class="contratos-programados-title contrato-section-title">Todos los contratos</p>
                <p class="contrato-empty">No hay contratos programados.</p>
            </div>
        `;
        return;
    }

    const itemsHTML = contratos.map(contrato => {
        const nombre = contrato.nombre_animales || "Sin animales asignados";
        const fechaInicio = contrato.fecha_inicio ?? "-";
        const fechaFin = contrato.fecha_fin ?? "-";
        return `
            <div class="contratos-programados-item" data-id="${contrato.id_contrato}">
                <span class="contratos-programados-nombre">${nombre}</span>
                <span class="contratos-programados-fechas">${fechaInicio} → ${fechaFin}</span>
            </div>
        `;
    }).join("");

    container.innerHTML = `
        <div class="contratos-programados-card">
            <div class="contratos-programados-title-row">
                <p class="contratos-programados-title contrato-section-title">Todos los contratos</p>
                <span class="contratos-programados-count">${contratos.length}</span>
            </div>
            <div class="contratos-programados-list">${itemsHTML}</div>
        </div>
    `;

    container.querySelectorAll(".contratos-programados-item").forEach(item => {
        item.addEventListener("click", () => {
            const id = item.getAttribute("data-id");
            if (id) {
                obtenerDetallesContrato(Number(id));
            }
        });
    });
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

function getContratosActivos() {
    const h2_cabecera = document.getElementById("cabecera");
    const container = document.getElementById("contratos-activos");
    const muestraContrato = document.getElementById("muestra-contrato");
    const listaProgramados = document.getElementById("contratos-programados");

    container.innerHTML = "";
    muestraContrato.innerHTML = "";
    muestraContrato.style.display = "none";
    container.style.display = "block";
    if (listaProgramados) {
        listaProgramados.style.display = "block";
        listaProgramados.innerHTML = `<p class="contrato-empty">Cargando contratos...</p>`;
    }

    // Función para parsear fechas DD-MM-YYYY
    function parseDate(str) {
        const [day, month, year] = str.split("-");
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }

    Promise.all([
        fetchAPI(`/api/dashboard/contratos_programados`),
        fetchAPI(`/api/dashboard/contratos_activos`)
    ])
        .then(([contratosProgramados, contratos_activos]) => {
            if (listaProgramados) {
                renderContratosProgramados(contratosProgramados, listaProgramados);
            }
            const hayContratos = Object.values(contratos_activos).some(lista => lista.length > 0);
            if (!hayContratos) {
                container.innerHTML = "<p style='text-align:center'>NO HAY CONTRATOS ACTIVOS</p>";
                return;
            }

            const ordenPersonalizado = Object.keys(contratos_activos).sort((a, b) => {
                if (a === "HOY") return -1;
                if (b === "HOY") return 1;
                if (a === "MAÑANA") return -1;
                if (b === "MAÑANA") return 1;

                return parseDate(a) - parseDate(b);
            });

            ordenPersonalizado.forEach(etiqueta => {
                const contratos = contratos_activos[etiqueta];
                if (!contratos || contratos.length === 0) {
                    return; // Saltar días sin contratos
                }

                const header = document.createElement("h2");
                header.classList.add("day-header");
                header.textContent = `${getNombreDia(etiqueta)}${etiqueta}`;
                container.appendChild(header);

                contratos.forEach(contrato => {
                    const contratoDiv = document.createElement("div");
                    contratoDiv.classList.add("contrato");
                    contratoDiv.setAttribute("data-id", contrato.id_contrato);
                    contratoDiv.addEventListener("click", () => {
                        obtenerDetallesContrato(contrato.id_contrato);
                    });
                    contratoDiv.innerHTML = `
                    <p class="animales">${contrato.nombre_animales}</p>
                    <p>Hasta ${contrato.fecha_fin}</p>
                `;
                    container.appendChild(contratoDiv);
                });
            });
        })
        .catch(error => {
            console.error("🚨 Error cargando contratos:", error);
            container.innerHTML = "<p>Error al cargar los contratos.</p>";
            if (listaProgramados) {
                listaProgramados.innerHTML = "<p>Error al cargar la lista completa.</p>";
            }
        });
}

function obtenerDetallesContrato(id_contrato) {
    fetchAPI(`/api/contratos/${id_contrato}`)
        .then(contrato => {
            const container = document.getElementById("contratos-activos");
            const muestraContrato = document.getElementById("muestra-contrato");
            const listaProgramados = document.getElementById("contratos-programados");

            container.style.display = "none";
            muestraContrato.style.display = "block";
            if (listaProgramados) {
                listaProgramados.style.display = "none";
            }

            const nombreAnimales = contrato.nombre_animales || "No hay animales asignados";
            const tarifaNombre = contrato.tarifa || "Tarifa no asignada";
            const precioTarifa = Number(contrato.precio_tarifa);
            const tarifaConImporte = contrato.tarifa
                ? `${contrato.tarifa}${Number.isFinite(precioTarifa) ? ` (${precioTarifa.toFixed(2)} €)` : ""}`
                : "Tarifa no asignada";

            const avisoAnimales = nombreAnimales === "No hay animales asignados"
                ? `<p style="color: red; font-weight: bold;">⚠️ ${nombreAnimales}</p>`
                : `<p class="animales">${nombreAnimales}</p>`;

            const avisoTarifa = tarifaNombre === "Tarifa no asignada"
                ? `<p style="color: red; font-weight: bold;">⚠️ ${tarifaNombre}</p>`
                : `<p>Tarifa: ${tarifaNombre}</p>`;

            let horarioContrato = contrato.horario;
            if (typeof horarioContrato === "string") {
                try {
                    horarioContrato = JSON.parse(horarioContrato);
                } catch (error) {
                    console.warn("No se pudo parsear el horario del contrato:", error);
                    horarioContrato = null;
                }
            }
            const horarioHTML = formatearHorario(horarioContrato);
            const totalContrato = contrato.total ?? 0;
            const pagadoContrato = contrato.pagado ?? 0;
            const pagoPendiente = contrato.pendiente ?? (Number(totalContrato) - Number(pagadoContrato));
            const totalVisitas = calcularTotalVisitas(contrato);

            const pagosHTML = `
                <div class="contrato-payments">
                    ${crearPagoCard({ etiqueta: "Total", importe: totalContrato })}
                    ${crearPagoCard({ etiqueta: "Pagado", importe: pagadoContrato })}
                    ${crearPagoCard({ etiqueta: "Pendiente", importe: pagoPendiente, esTotal: true })}
                </div>
            `;
            const visitasTotalesHTML = totalVisitas !== null ? `
                <p class="contrato-visitas-row">
                    <span class="contrato-data-label">Totales</span>
                    <span class="contrato-visitas-value">${totalVisitas}</span>
                </p>
            ` : "";

            muestraContrato.innerHTML = `
                <div class="contrato-detalle-card">
                    <div class="contrato-id">Contrato ${contrato.id_contrato ?? ""}</div>
                    ${avisoAnimales}
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
                                    ${horarioHTML ?? ""}
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
                            ${pagosHTML}
                            ${contrato.observaciones ? `
                                <div class="contrato-section contrato-observaciones">
                                    <p class="contrato-section-title">Observaciones</p>
                                    <p>${contrato.observaciones}</p>
                                </div>
                            ` : ""}
                        </div>
                        <div class="contrato-detail-photo">
                            ${contrato.foto ? `<img src="${contrato.foto}" alt="Foto del contrato">` : `<p class="contrato-empty">No hay foto disponible</p>`}
                        </div>
                    </div>
                    <div class="contrato-detail-actions">
                        <button onclick="editarContratoDesdeDashboard(${Number(contrato.id_contrato) || 0}, ${Number(contrato.id_cliente) || 0})">Modificar</button>
                        <button onclick="getContratosActivos()">Volver al dashboard</button>
                    </div>
                </div>
            `;
        })
        .catch(error => console.error("🚨 Error al obtener detalles del contrato:", error));
}

function editarContratoDesdeDashboard(idContrato, idCliente) {
    const contrato = Number(idContrato);
    const cliente = Number(idCliente);
    if (!Number.isFinite(contrato) || contrato <= 0 || !Number.isFinite(cliente) || cliente <= 0) {
        alert("No se pudo identificar el cliente o contrato para modificar.");
        return;
    }
    const url = `/clientes?id_cliente=${encodeURIComponent(String(cliente))}&editar_contrato=${encodeURIComponent(String(contrato))}`;
    window.location.href = url;
}
