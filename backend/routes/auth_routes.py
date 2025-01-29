from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from models.Clientes import Clientes
from models.Animales import Animales
from models.ContactosAdicionales import ContactosAdicionales
from models.Tarifas import Tarifas
from models.TarifasContrato import TarifasContrato
from models.Usuarios import Usuarios

from utils.auth import generar_token, verificar_token

auth_bp = Blueprint('auth_bp', __name__)

# Ruta de registro
@auth_bp.route('/registro', methods=['POST'])
def registro():
    datos = request.json
    if not datos.get('email') or not datos.get('password'):
        return jsonify({"mensaje": "Email y contraseña son requeridos"}), 400

    # Comprobar si el cliente ya existe
    if Cliente.query.filter_by(email=datos['email']).first():
        return jsonify({"mensaje": "El email ya está registrado"}), 400

    # Crear nuevo cliente
    nuevo_cliente = Cliente(
        nombre=datos.get('nombre'),
        apellidos=datos.get('apellidos'),
        email=datos['email'],
        telefono=datos.get('telefono'),
        password_hash=generate_password_hash(datos['password'])
    )
    db.session.add(nuevo_cliente)
    db.session.commit()

    return jsonify({"mensaje": "Cliente registrado exitosamente"}), 201

# Ruta de login
@auth_bp.route('/login', methods=['POST'])
def login():
    datos = request.json
    cliente = Cliente.query.filter_by(email=datos['email']).first()

    if not cliente or not check_password_hash(cliente.password_hash, datos['password']):
        return jsonify({"mensaje": "Credenciales inválidas"}), 401

    # Generar token
    token = generar_token({"id_cliente": cliente.id_cliente, "email": cliente.email})
    return jsonify({"token": token}), 200
