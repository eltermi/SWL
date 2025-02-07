/* Contenido base para auth.js */
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password })
    }).then(res => res.json()).then(data => {
        if (data.success) {
            localStorage.setItem('token', data.token);
            window.location.href = 'dashboard.html';
        } else {
            alert('Login incorrecto');
        }
    });
}
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}
