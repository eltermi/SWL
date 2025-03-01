document.addEventListener('DOMContentLoaded', function () {
    console.log("Antes de la llamada a contratos activos");
    getContratosActivos();
});

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
    }).catch(error => console.error("🚨 Error en la API:", error));
}

function getContratosActivos() {
    const h2_cabecera = document.getElementById("cabecera");
    const container = document.getElementById("contratos-activos");
    const muestraContrato = document.getElementById("muestra-contrato");
    
    container.innerHTML = "";
    muestraContrato.innerHTML = "";
    muestraContrato.style.display = "none";
    container.style.display = "block";

    const fechaActual = new Date();
    const dia = String(fechaActual.getDate()).padStart(2, '0');
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
    const anio = fechaActual.getFullYear();
    h2_cabecera.textContent = `${dia}/${mes}/${anio}`;

    fetchAPI(`/api/contratos/activos`)  
    .then(contratos_activos => {
        if (!contratos_activos.length) {
            h2_cabecera.textContent = "No hay contratos activos";
            return;
        }
        contratos_activos.forEach(contrato => {
            const contratoDiv = document.createElement("div");
            contratoDiv.classList.add("contrato");
            contratoDiv.setAttribute("data-id", contrato.id_contrato);
            contratoDiv.addEventListener("click", () => {
                obtenerDetallesContrato(contrato.id_contrato);
            });
            
            contratoDiv.innerHTML = `
                <div class="contrato-content">
                    <div class="detalles">
                        <p class="animales">${contrato.nombre_animales}</p>
                        <p>Desde el ${contrato.fecha_inicio} <br />
                        Hasta ${contrato.fecha_fin}</p>
                        <p>Tarifa: ${contrato.tarifa}</p>
                        <p>Visitas: ${contrato.visitas}</p>
                    </div>
                    <div class="detalles">
                        <p>Desde el ${contrato.fecha_inicio} <br />
                        hasta ${contrato.fecha_fin}</p>
                        <p>Tarifa: ${contrato.tarifa}</p>
                        <p>Visitas: ${contrato.visitas}</p>
                    </div>
                    <div class="contrato-foto">
                        ${contrato.foto ? `<img src="${contrato.foto}" alt="Foto del gato">` : "No hay foto disponible"}
                    </div>
                </div>
            `;
            container.appendChild(contratoDiv);
        });
    })
    .catch(error => console.error("🚨 Error cargando contratos:", error));
}

function obtenerDetallesContrato(id_contrato) {
    fetchAPI(`/api/contratos/${id_contrato}`)
        .then(contrato => {
            const container = document.getElementById("contratos-activos");
            const muestraContrato = document.getElementById("muestra-contrato");
            
            container.style.display = "none";
            muestraContrato.style.display = "block";
            muestraContrato.innerHTML = `
                <div class="contrato">
                    <div class="contrato-content">
                        <div class="detalles">
                            <p class="animales">${contrato.nombre_animales}</p>
                            <p>Desde el ${contrato.fecha_inicio} hasta ${contrato.fecha_fin}</p>
                            <p>Tarifa: ${contrato.tarifa}</p>
                            <p>Visitas: ${contrato.visitas}</p>
                            <button onclick="getContratosActivos()">Volver a contratos</button>
                        </div>
                        <div class="contrato-foto">
                            ${contrato.foto ? `<img src="${contrato.foto}" alt="Foto del gato">` : "No hay foto disponible"}
                        </div>
                    </div>
                </div>
            `;
        })
        .catch(error => console.error("🚨 Error al obtener detalles del contrato:", error));
}
