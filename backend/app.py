from flask import Flask, send_from_directory
from flask_swagger_ui import get_swaggerui_blueprint
from extensions import db
from routes.auth_routes import auth_bp
from routes.clientes_routes import clientes_bp
from routes.contratos_routes import contratos_bp
from routes.animales_routes import animales_bp
from routes.contactos_routes import contactos_bp
from routes.tarifas_routes import tarifas_bp
from routes.tarifas_contrato_routes import tarifas_contrato_bp
from routes.usuarios_routes import usuarios_bp
from models import *  # Asegurar que los modelos se importan

import os

# Crear la instancia de la aplicación Flask
app = Flask(__name__, static_folder="../frontend", static_url_path="")

@app.route("/")
def home():
    return send_from_directory(app.static_folder, "index.html")
def index():
    return send_from_directory(app.static_folder, "index.html")

# Configurar Swagger UI
SWAGGER_URL = "/swagger"
API_URL = "/static/swagger.json"  # Ruta al archivo Swagger JSON
swagger_ui_blueprint = get_swaggerui_blueprint(SWAGGER_URL, API_URL)
app.register_blueprint(swagger_ui_blueprint, url_prefix=SWAGGER_URL)

@app.route("/static/<path:filename>")
def send_static(filename):
    return send_from_directory("static", filename)

# Configuración de la base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://sitters:gatos@localhost/SWL'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializar la base de datos
db.init_app(app)

with app.app_context():
    db.create_all()  # 🔹 Asegurar que las tablas existen antes de acceder a ellas

# Registrar los Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(clientes_bp)
app.register_blueprint(contratos_bp)
app.register_blueprint(animales_bp)
app.register_blueprint(contactos_bp)
app.register_blueprint(tarifas_bp)
app.register_blueprint(tarifas_contrato_bp)
app.register_blueprint(usuarios_bp)

# Ejecutar la aplicación
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
