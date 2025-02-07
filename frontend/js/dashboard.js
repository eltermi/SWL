/* Contenido base para dashboard.js */
document.addEventListener('DOMContentLoaded', function () {
    fetchAPI('/api/dashboard').then(data => {
        document.getElementById('dashboard-content').innerHTML = `<p>Bienvenido, ${data.username}</p>`;
    });
});