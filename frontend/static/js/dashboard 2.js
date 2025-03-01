/* Contenido base para dashboard.js */
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

function getContratosActivos(busqueda = "") {
    const h2_cabecera = document.getElementById("cabecera");
    h2_cabecera.innerHTML = "";
    const fechaActual = new Date();
    const dia = String(fechaActual.getDate()).padStart(2, '0'); // Día (con ceros a la izquierda si es necesario)
    const mes = String(fechaActual.getMonth() + 1).padStart(2, '0'); // Mes (getMonth() devuelve 0-11, por eso +1)
    const anio = fechaActual.getFullYear(); // Año

    const fechaFormateada = `${dia}/${mes}/${anio}`; // Formato dd/mm/aaaa

    fetchAPI(`/api/contratos/activos`)  
    .then(contratos_activos => {
        console.log("En getContratosActivos - Contratos recibidos:", contratos_activos); // Debug

        if (Array.isArray(contratos_activos) && contratos_activos.length === 0) {
            h2_cabecera.textContent = `No hay visitas para el ${fechaFormateada}`;
            return;
        } else {
            h2_cabecera.textContent = `${fechaFormateada}`;
            const container = document.getElementById("contratos-activos");

            contratos_activos.forEach(contrato => {
                // 📌 Crear el contenedor del contrato (será clickeable)
                const contratoDiv = document.createElement("div");
                contratoDiv.classList.add("contrato");
                contratoDiv.setAttribute("data-id", contrato.id_contrato);

                // 📌 Evento para redirigir al hacer clic en todo el div
                contratoDiv.addEventListener("click", () => {
                    obtenerDetallesContrato(contrato.id_contrato);
                });

                // 📌 Contenedor principal (detalles + foto)
                const contentDiv = document.createElement("div");
                contentDiv.classList.add("contrato-content");

                // 📋 Detalles del contrato (a la izquierda)
                const detallesDiv = document.createElement("div");
                detallesDiv.classList.add("detalles");

                const gatosP = document.createElement("p");
                gatosP.classList.add("animales");
                gatosP.textContent = contrato.nombre_animales;
                detallesDiv.appendChild(gatosP);

                const inicioP = document.createElement("p");
                inicioP.textContent = `Desde el ${contrato.fecha_inicio}`;
                detallesDiv.appendChild(inicioP);

                const finalp = document.createElement("p");
                finalp.textContent = `hasta el: ${contrato.fecha_fin}`;
                detallesDiv.appendChild(finalp);

                const tarifap = document.createElement("p");
                tarifap.textContent = `Tarifa: ${contrato.tarifa}`;
                detallesDiv.appendChild(tarifap);

                const visitasp = document.createElement("p");
                visitasp.textContent = `Visitas: ${contrato.visitas}`;
                detallesDiv.appendChild(visitasp);

                // 📷 Imagen del gato (a la derecha)
                const fotoDiv = document.createElement("div");
                fotoDiv.classList.add("contrato-foto");

                if (contrato.foto) {
                    const img = document.createElement("img");
                    img.src = contrato.foto;
                    img.alt = "Foto del gato";
                    fotoDiv.appendChild(img);
                } else {
                    fotoDiv.textContent = "No hay foto disponible";
                }

                // 🏗️ Estructura final: Detalles a la izquierda, imagen a la derecha
                contentDiv.appendChild(detallesDiv);
                contentDiv.appendChild(fotoDiv);

                contratoDiv.appendChild(contentDiv);
                container.appendChild(contratoDiv);
            });
        }
    })
    .catch(error => {
        console.error("🚨 Error cargando contratos:", error);
    });

    /**
 * 📌 Función que llama a la API para obtener detalles del contrato
 */
function obtenerDetallesContrato(id_contrato) {
    console.log(`📡 Obteniendo detalles del contrato ID: ${id_contrato}`);

    fetch(`/api/contratos/${id_contrato}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Error al obtener el contrato");
            }
            return response.json();
        })
        .then(contrato => {
            console.log("📋 Datos del contrato:", contrato);
            const container = document.getElementById("muestra-contrato");


                const contratoDiv = document.createElement("div");
                contratoDiv.classList.add("contrato");
                contratoDiv.setAttribute("data-id", contrato.id_contrato);

                // 📌 Evento para redirigir al hacer clic en todo el div
                contratoDiv.addEventListener("click", () => {
                    obtenerDetallesContrato(contrato.id_contrato);
                });

                // 📌 Contenedor principal (detalles + foto)
                const contentDiv = document.createElement("div");
                contentDiv.classList.add("contrato-content");

                // 📋 Detalles del contrato (a la izquierda)
                const detallesDiv = document.createElement("div");
                detallesDiv.classList.add("detalles");

                const gatosP = document.createElement("p");
                gatosP.classList.add("animales");
                gatosP.textContent = contrato.nombre_animales;
                detallesDiv.appendChild(gatosP);

                const inicioP = document.createElement("p");
                inicioP.textContent = `Desde el ${contrato.fecha_inicio}`;
                detallesDiv.appendChild(inicioP);

                const finalp = document.createElement("p");
                finalp.textContent = `hasta el: ${contrato.fecha_fin}`;
                detallesDiv.appendChild(finalp);

                const tarifap = document.createElement("p");
                tarifap.textContent = `Tarifa: ${contrato.tarifa}`;
                detallesDiv.appendChild(tarifap);

                const visitasp = document.createElement("p");
                visitasp.textContent = `Visitas: ${contrato.visitas}`;
                detallesDiv.appendChild(visitasp);

                // 📷 Imagen del gato (a la derecha)
                const fotoDiv = document.createElement("div");
                fotoDiv.classList.add("contrato-foto");

                if (contrato.foto) {
                    const img = document.createElement("img");
                    img.src = contrato.foto;
                    img.alt = "Foto del gato";
                    fotoDiv.appendChild(img);
                } else {
                    fotoDiv.textContent = "No hay foto disponible";
                }

                // 🏗️ Estructura final: Detalles a la izquierda, imagen a la derecha
                contentDiv.appendChild(detallesDiv);
                contentDiv.appendChild(fotoDiv);

                contratoDiv.appendChild(contentDiv);
                container.appendChild(contratoDiv);
            
        })
        .catch(error => {
            console.error("🚨 Error al obtener detalles del contrato:", error);
        });
}

    // fetchAPI(`/api/contratos/activos`)  
    // .then(contratos_activos => {
    //     console.log("En getContratosActivos - Contratos recibidos:", contratos_activos); // Debug

    //     if (Array.isArray(contratos_activos) && contratos_activos.length === 0) {
    //         h2_cabecera.textContent = `No hay visitas para el ${fechaFormateada}`;
    //         return;
    //     } else {
    //         h2_cabecera.textContent = `${fechaFormateada}`;
    //         const container = document.getElementById("contratos-activos");

    //         contratos_activos.forEach(contrato => {
    //             const contratoDiv = document.createElement("div");
    //             contratoDiv.classList.add("contrato");

    //             // 📌 Contenedor principal (detalles + foto)
    //             const contentDiv = document.createElement("div");
    //             contentDiv.classList.add("contrato-content");

    //             // 📋 Div con los detalles del contrato (a la izquierda)
    //             const detallesDiv = document.createElement("div");
    //             detallesDiv.classList.add("detalles");

    //             const gatosP = document.createElement("p");
    //             gatosP.classList.add("animales");
    //             gatosP.textContent = contrato.nombre_animales;
    //             detallesDiv.appendChild(gatosP);

    //             const inicioP = document.createElement("p");
    //             inicioP.textContent = `Desde el ${contrato.fecha_inicio}`;
    //             detallesDiv.appendChild(inicioP);

    //             const finalp = document.createElement("p");
    //             finalp.textContent = `hasta el: ${contrato.fecha_fin}`;
    //             detallesDiv.appendChild(finalp);

    //             const tarifap = document.createElement("p");
    //             tarifap.textContent = `Tarifa: ${contrato.tarifa}`;
    //             detallesDiv.appendChild(tarifap);

    //             const visitasp = document.createElement("p");
    //             visitasp.textContent = `Visitas: ${contrato.visitas}`;
    //             detallesDiv.appendChild(visitasp);

    //             // 📷 Div para la imagen (a la derecha)
    //             const fotoDiv = document.createElement("div");
    //             fotoDiv.classList.add("contrato-foto");

    //             if (contrato.foto) {
    //                 const img = document.createElement("img");
    //                 img.src = contrato.foto;
    //                 img.alt = "Foto del gato";
    //                 fotoDiv.appendChild(img);
    //             } else {
    //                 fotoDiv.textContent = "No hay foto disponible";
    //             }

    //             // 🏗️ Estructura final: Detalles a la izquierda, imagen a la derecha
    //             contentDiv.appendChild(detallesDiv);
    //             contentDiv.appendChild(fotoDiv);

    //             contratoDiv.appendChild(contentDiv);
    //             container.appendChild(contratoDiv);
    //         });
    //     }
    // })
    // .catch(error => {
    //     console.error("🚨 Error cargando contratos:", error);
    // });

}