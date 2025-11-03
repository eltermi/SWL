/* Contenido base para animales.js */
document.addEventListener('DOMContentLoaded', function () {
    cargarAnimales();
    cargarClientesEnFormulario();
    document.getElementById('animal-form').addEventListener('submit', agregarAnimal);
    document.getElementById('buscar').addEventListener('input', buscarAnimales);
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
                        obtenerDetallesAnimal(animal.id_animal);
                    });

                    animalDiv.innerHTML = `
                        <div class="animal-content">
                            <div class="detalles">
                                <p><span class="nombreAnimal">${animal.nombre_animal}</span></p>
                                <p><span class="encabezado">Edad:</span> ${animal.edad}</p>
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
    const formData = new FormData();
    formData.append("nombre", document.getElementById('form-nombre-animal').value);
    formData.append("id_cliente", document.getElementById('form-nombre-cliente').value);
    formData.append("tipo_animal", document.getElementById('form-tipo-animal').value);
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
    }).then(() => {
        cargarAnimales();
        document.getElementById('animal-form').reset();
    }).catch(error => console.error("🚨 Error al agregar animal:", error));
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
    fetchAPI(`/api/animales/${id}`, { method: 'DELETE' })
        .then(() => cargarAnimales());
}

function editarAnimal(id) {
    const nuevoEdad = prompt("Nueva edad:");
    const nuevoMedicacion = prompt("Nueva medicación:");

    if (nuevoEdad && nuevoMedicacion) {
        fetchAPI(`/api/animales/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ edad: nuevoEdad, medicacion: nuevoMedicacion })
        }).then(() => cargarAnimales());
    }
}

function buscarAnimales(event) {
    const filtro = event.target.value;
    cargarAnimales(filtro);
}