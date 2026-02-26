from flask import Blueprint, request, jsonify
from extensions import db
from models import Usuarios
from werkzeug.security import generate_password_hash
from utils.auth import requerir_autenticacion

usuarios_bp = Blueprint('usuarios', __name__)

@usuarios_bp.route('/usuarios', methods=['GET'])
@requerir_autenticacion
def obtener_usuarios():
    usuarios = Usuarios.query.all()
    return jsonify([{
        'id_usuario': usuario.id_usuario,
        'username': usuario.username,
        'rol': usuario.rol
    } for usuario in usuarios])

@usuarios_bp.route('/usuarios', methods=['POST'])
@requerir_autenticacion
def crear_usuario():
    datos = request.json
    datos['password_hash'] = generate_password_hash(datos.pop('password'))  # Hashear la contraseña
    nuevo_usuario = Usuarios(**datos)
    db.session.add(nuevo_usuario)
    db.session.commit()
    return jsonify({'mensaje': 'Usuario creado exitosamente'}), 201
