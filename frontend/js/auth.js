// Sitters with Love - Aplicación Completa (Actualizada)

// auth.js

// Verificar si el usuario ya está autenticado
function isAuthenticated() {
    return !!sessionStorage.getItem('token');
}

// Redirigir al usuario si no está autenticado
function checkAuthentication() {
    if (!isAuthenticated()) {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = 'index.html';
    }
}

// Guardar la última página visitada antes de ser redirigido a login
if (!sessionStorage.getItem('redirectAfterLogin')) {
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
}

// Modificar la función de login para redirigir al usuario a la última página que intentó visitar
async function login(event) {
    event.preventDefault();
    const username = document.getElementById('usuario').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            throw new Error('Login failed');
        }
        
        const data = await response.json();
        sessionStorage.setItem('token', data.token);
        
        // Obtener la página donde intentaba acceder antes de autenticarselet redirectPage = sessionStorage.getItem('redirectAfterLogin');

        let redirectPage = sessionStorage.getItem('redirectAfterLogin');
        if (!redirectPage || redirectPage.includes("index.html")) {
            redirectPage = "clientes.html";  // Página por defecto si no hay otra página válida
        }

        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectPage;

    } catch (error) {
        console.error('Error:', error);
    }
}

// Cerrar sesión
function logout() {
    sessionStorage.removeItem('token');
    window.location.href = 'index.html';
}

// Añadir el evento para que el login se active al presionar 'Enter'
document.getElementById('login-form').addEventListener('submit', login);

// Verificar autenticación en páginas protegidas
if (!window.location.pathname.includes("index.html")) {
    checkAuthentication();
}
