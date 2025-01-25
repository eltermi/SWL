from flask import Flask
from extensions import db
from routes.auth_routes import auth_bp
from routes.clientes_routes import clientes_bp
from routes.contratos_routes import contratos_bp
from routes.animales_routes import animales_bp

# Importar los modelos
from models.cliente import Cliente
from models.contrato import Contrato
from models.animal import Animal
from models.usuario import Usuario

# Crear la instancia de la aplicación Flask
app = Flask(__name__)

# Configuración de la base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://usuario:password@localhost/swl'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializar la base de datos
db.init_app(app)

# Registrar los Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(clientes_bp)
app.register_blueprint(contratos_bp)
app.register_blueprint(animales_bp)

# Ejecutar la aplicación
if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5001)
