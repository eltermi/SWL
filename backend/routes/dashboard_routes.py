from flask import Blueprint, jsonify, request
from models import Usuarios
from utils.auth import verificar_token, requerir_autenticacion

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard/usuario', methods=['POST'])
def get_dashboard():

    datos = request.json
    token = datos['token'];
    token_data = verificar_token(token)
    print(f"Token data: {token_data}")
    if not token_data:
        return jsonify({"error": "No autorizado"}), 401

    usuario = Usuarios.query.get(token_data["id_usuario"])
    
    if not usuario:
        return jsonify({"error": "Usuario no encontrado"}), 404

    return jsonify({"username": usuario.username}), 200


