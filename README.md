# Sitters with Love - Backend

Este repositorio contiene el backend de la aplicación **Sitters with Love**, un sistema de gestión para un negocio de cuidado de gatos en Luxemburgo.

## Tecnologías utilizadas

- **Python**: Lenguaje principal para el desarrollo del backend.
- **Flask**: Framework web utilizado para crear las APIs.
- **Flask-SQLAlchemy**: Extensión para la gestión de la base de datos.
- **MySQL**: Sistema de gestión de base de datos.
- **Flask-Migrate**: Para manejar las migraciones de la base de datos.
- **PyJWT**: Para la autenticación basada en tokens.

## Estructura del proyecto

```
backend/
├── app.py               # Archivo principal para ejecutar el servidor Flask
├── config.py            # Configuración del proyecto
├── models/              # Modelos de la base de datos
├── routes/              # Rutas y endpoints de la API
├── migrations/          # Migraciones de la base de datos
├── utils/               # Funciones auxiliares
├── static/              # Archivos estáticos (como el JSON de Swagger)
└── script_creacion_bbdd.sql  # Script para crear la base de datos desde cero
```

## Instalación

1. Clona este repositorio:
   ```bash
   git clone <URL_DE_TU_REPOSITORIO>
   cd backend
   ```

2. Crea un entorno virtual e instálalo:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Para Linux/Mac
   venv\Scripts\activate    # Para Windows
   pip install -r requirements.txt
   ```

3. Crea la base de datos en MySQL:
   ```bash
   mysql -u <usuario> -p < script_creacion_bbdd.sql
   ```

4. Ejecuta las migraciones:
   ```bash
   flask db upgrade
   ```

5. Inicia el servidor:
   ```bash
   python app.py
   ```

El servidor estará disponible en `http://127.0.0.1:5001`.

## Endpoints principales

Puedes consultar todos los endpoints en la documentación generada por Swagger:

- `http://127.0.0.1:5001/swagger`

### Ejemplo de endpoints:

- **GET /clientes**: Obtiene todos los clientes.
- **POST /clientes**: Crea un nuevo cliente.
- **GET /contratos**: Obtiene todos los contratos.

## Notas importantes

- **Autenticación**: Algunas rutas están protegidas y requieren un token JWT.
- **Migraciones**: Asegúrate de realizar migraciones cada vez que se actualicen los modelos.
- **Archivos estáticos**: Las fotos de los animales y facturas se almacenan como rutas en lugar de binarios dentro de la base de datos.

## Contribuciones

Si deseas contribuir a este proyecto, realiza un fork y crea un pull request con tus cambios. Por favor, describe detalladamente las modificaciones que realizaste.

---

Desarrollado con ❤ por [María](#).

