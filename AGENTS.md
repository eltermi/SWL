# AGENTS.md

## SWL Infraestructura Operativa (obligatorio)

Este proyecto usa infraestructura local en macOS con Flask + Gunicorn + MySQL + LaunchAgent.

### Stack y rutas
- Backend: `/Users/rafa/Sitters_with_love/aplicacion/backend`
- Venv: `/Users/rafa/Sitters_with_love/aplicacion/venv`
- LaunchAgent backend: `~/Library/LaunchAgents/com.sitterswithlove.backend.plist`
- Logs Gunicorn:
  - `~/SWL_backups/logs/swl-gunicorn.out.log`
  - `~/SWL_backups/logs/swl-gunicorn.err.log`
- Puerto backend obligatorio: `0.0.0.0:8000`

### Comandos de operación
Usar siempre los comandos de servicio:
- `swl start`
- `swl stop`
- `swl restart`
- `swl status`

Comprobaciones estándar tras cambios:
1. `swl restart`
2. `swl status`
3. `lsof -nP -iTCP:8000 -sTCP:LISTEN`
4. `tail -n 120 ~/SWL_backups/logs/swl-gunicorn.err.log`

### Reglas críticas
- No ejecutar `python app.py` para servir backend.
- No levantar Flask dev server para pruebas normales.
- No cambiar bind/puerto fuera de `0.0.0.0:8000`.
- No eliminar ni hardcodear fallback de `JWT_SECRET_KEY`.
- No modificar LaunchAgent sin petición explícita del usuario.
- Si `swl stop` no para el servicio, verificar `launchctl list | grep com.sitterswithlove.backend` y actuar sobre el LaunchAgent, no levantar procesos paralelos.

### JWT y arranque
`JWT_SECRET_KEY` viene del LaunchAgent. Si falta, backend debe fallar al arrancar (comportamiento esperado).

### Base de datos
- MySQL local (`localhost:3306`), Homebrew.
- Usuario app: `sitters@localhost`.
- No exponer MySQL en red.

### Acceso remoto
- Acceso remoto via Tailscale.
- Mantener backend en `0.0.0.0:8000`; no bind a IP Tailscale específica.

### Protocolo de depuración recomendado
Si hay regresión tras cambios:
1. Reiniciar con `swl restart`.
2. Confirmar proceso escuchando en `:8000`.
3. Revisar `swl-gunicorn.err.log` antes de asumir fallo de código.
4. Evitar múltiples instancias de gunicorn fuera de launchd.
