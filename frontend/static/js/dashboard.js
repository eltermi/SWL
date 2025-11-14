document.addEventListener('DOMContentLoaded', function () {
    getContratosActivos();
});

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
    const estadoClase = `pago-estado pago-estado--${estadoSlug}`;

    return `
        <div class="pago-card">
            <span class="pago-label">${etiqueta}</span>
            <strong>${importeFormateado}</strong>
            <span class="${estadoClase.trim()}">${estadoTexto}</span>
        </div>
    `;
}

function getContratosActivos() {
    const h2_cabecera = document.getElementById("cabecera");
    const container = document.getElementById("contratos-activos");
    const muestraContrato = document.getElementById("muestra-contrato");

    container.innerHTML = "";
    muestraContrato.innerHTML = "";
    muestraContrato.style.display = "none";
    container.style.display = "block";

    // Función para parsear fechas DD-MM-YYYY
    function parseDate(str) {
        const [day, month, year] = str.split("-");
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    }

    fetchAPI(`/api/dashboard/contratos_activos`)
        .then(contratos_activos => {
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
        });
}

function obtenerDetallesContrato(id_contrato) {
    fetchAPI(`/api/contratos/${id_contrato}`)
        .then(contrato => {
            const container = document.getElementById("contratos-activos");
            const muestraContrato = document.getElementById("muestra-contrato");

            container.style.display = "none";
            muestraContrato.style.display = "block";

            const nombreAnimales = contrato.nombre_animales || "No hay animales asignados";
            const tarifaNombre = contrato.tarifa || "Tarifa no asignada";

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
            const pago1 = contrato.pago_adelantado ?? 0;
            const pago2 = contrato.pago_final ?? 0;
            const pagoTotal = contrato.pago_total ?? (Number(pago1) + Number(pago2));

            const pagosHTML = `
                <div class="contrato-payments">
                    ${crearPagoCard({ etiqueta: "Pago 1", importe: pago1, estado: contrato.estado_pago_adelantado })}
                    ${crearPagoCard({ etiqueta: "Pago 2", importe: pago2, estado: contrato.estado_pago_final })}
                    ${crearPagoCard({ etiqueta: "Pago Total", importe: pagoTotal, esTotal: true })}
                </div>
            `;

            muestraContrato.innerHTML = `
                <div class="contrato-detalle-card">
                    <div class="contrato-id">Contrato ${contrato.id_contrato ?? ""}</div>
                    ${avisoAnimales}
                    <div class="contrato-detail-layout">
                        <div class="contrato-detail-main">
                            <div class="contrato-sections">
                                <div class="contrato-section">
                                    <p class="contrato-section-title">Fechas</p>
                                    <p><span class="contrato-data-label">Inicio</span>${contrato.fecha_inicio ?? "-"}</p>
                                    <p><span class="contrato-data-label">Fin</span>${contrato.fecha_fin ?? "-"}</p>
                                </div>
                                <div class="contrato-section">
                                    <p class="contrato-section-title">Visitas</p>
                                    <p><span class="contrato-data-label">Por día</span>${contrato.visitas ?? "-"}</p>
                                    ${horarioHTML || `<p class="contrato-empty">Horario no definido</p>`}
                                </div>
                                <div class="contrato-section">
                                    <p class="contrato-section-title">Tarifa</p>
                                    <p>${tarifaNombre}</p>
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
                        <button onclick="getContratosActivos()">Volver al dashboard</button>
                    </div>
                </div>
            `;
        })
        .catch(error => console.error("🚨 Error al obtener detalles del contrato:", error));
}
