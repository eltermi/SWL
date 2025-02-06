from flask import Blueprint
from routes.clientes_routes import clientes_bp
from routes.animales_routes import animales_bp
from routes.contratos_routes import contratos_bp
from routes.auth_routes import auth_bp
from routes.contactos_routes import contactos_bp
from routes.tarifas_routes import tarifas_bp
from routes.tarifas_contrato_routes import tarifas_contrato_bp
from routes.usuarios_routes import usuarios_bp

def register_blueprints(app):
    app.register_blueprint(clientes_bp)
    app.register_blueprint(animales_bp)
    app.register_blueprint(contratos_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(contactos_bp)
    app.register_blueprint(tarifas_bp)
    app.register_blueprint(tarifas_contrato_bp)
    app.register_blueprint(usuarios_bp)
