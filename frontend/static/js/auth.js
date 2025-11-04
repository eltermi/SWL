const LOGIN_PATH = '/';
const DEFAULT_REDIRECT = '/dashboard';

function getCurrentRoute() {
    return window.location.pathname + window.location.search + window.location.hash;
}

function displayLoginError(message = '') {
    const errorBox = document.getElementById('login-error');
    if (!errorBox) return;

    if (message) {
        errorBox.textContent = message;
        errorBox.style.display = 'block';
    } else {
        errorBox.textContent = '';
        errorBox.style.display = 'none';
    }
}

function isAuthenticated() {
    return !!sessionStorage.getItem('token');
}

function checkAuthentication() {
    if (!isAuthenticated()) {
        sessionStorage.setItem('redirectAfterLogin', getCurrentRoute());
        window.location.href = LOGIN_PATH;
    }
}

async function login(event) {
    event.preventDefault();
    displayLoginError();

    const username = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        displayLoginError('Introduce usuario y contraseña.');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        let data;
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.mensaje || 'Credenciales inválidas. Inténtalo de nuevo.';
            throw new Error(message);
        } else {
            data = await response.json();
        }

        if (!data?.token) {
            throw new Error('No se recibió token en la respuesta.');
        }

        sessionStorage.setItem('token', data.token);

        let redirectPage = sessionStorage.getItem('redirectAfterLogin');
        if (!redirectPage || redirectPage === LOGIN_PATH) {
            redirectPage = DEFAULT_REDIRECT;
        }

        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirectPage;
    } catch (error) {
        console.error('Error:', error);
        displayLoginError(error.message || 'Error en el inicio de sesión.');
    }
}

function logout() {
    sessionStorage.removeItem('token');
    if (window.location.pathname !== LOGIN_PATH) {
        sessionStorage.setItem('redirectAfterLogin', getCurrentRoute());
    } else {
        sessionStorage.removeItem('redirectAfterLogin');
    }
    window.location.href = LOGIN_PATH;
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', login);
}

if (window.location.pathname !== LOGIN_PATH) {
    checkAuthentication();
}
