/* Contenido actualizado para auth.js */
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    }).then(res => res.json()).then(data => {
        console.log("🔑 Token recibido en login:", data.token); // DEBUG

        if (data.token) {
            sessionStorage.setItem("token", data.token);
            console.log("✅ Token guardado en sessionStorage:", sessionStorage.getItem("token")); // DEBUG
            window.location.href = "clientes.html";
        } else {
            alert("❌ Credenciales incorrectas");
        }
    }).catch(error => console.error("🚨 Error en el login:", error));
}


function logout() {
    sessionStorage.removeItem("token");
    window.location.href = "index.html";
}