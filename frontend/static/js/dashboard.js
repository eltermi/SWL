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

            muestraContrato.innerHTML = `
                <div class="contrato">
                    <div class="contrato-content">
                        <div class="detalles">
                            <p class="encabezado">Contrato #${contrato.id_contrato}</p>
                            ${avisoAnimales}
                            <p class="fecha_contrato">INICIO ${contrato.fecha_inicio}</p>
                            <p class="fecha_contrato">FIN ${contrato.fecha_fin}</p>
                            ${avisoTarifa}
                            <p>Visitas diarias: ${contrato.visitas}</p>
                            <p>${formatearHorario(typeof contrato.horario === "string" ? JSON.parse(contrato.horario) : contrato.horario)}</p>
                            <p>Pago adelantado: ${contrato.estado_pago_adelantado}</p>
                            <p>Pago final: ${contrato.estado_pago_final}</p>
                            <p align="center">
                                <button onclick="getContratosActivos()">Volver al dashboard</button>
                            </p>
                        </div>
                        <div class="contrato-foto">
                            ${contrato.foto ? `<img src="${contrato.foto}" alt="Foto del contrato">` : "No hay foto disponible"}
                        </div>
                    </div>
                </div>
            `;
        })
        .catch(error => console.error("🚨 Error al obtener detalles del contrato:", error));
}