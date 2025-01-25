import jwt
from datetime import datetime, timedelta

SECRET_KEY = "TuClaveSecretaSegura"  # Cambia esto a una clave más segura

def generar_token(data, expiracion=60):
    """
    Genera un token JWT.
    :param data: Información a incluir en el token (dict)
    :param expiracion: Minutos para la expiración
    :return: Token en formato string
    """
    payload = {
        "data": data,
        "exp": datetime.utcnow() + timedelta(minutes=expiracion),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verificar_token(token):
    """
    Verifica un token JWT.
    :param token: Token en formato string
    :return: Información decodificada si es válido
    """
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded["data"]
    except jwt.ExpiredSignatureError:
        return None  # Token expirado
    except jwt.InvalidTokenError:
        return None  # Token inválido

from flask import request, jsonify
from functools import wraps
from utils.auth import verificar_token

def requerir_autenticacion(func):
    @wraps(func)
    def envoltura(*args, **kwargs):
        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"mensaje": "Token no proporcionado"}), 401

        data = verificar_token(token.split(" ")[1])  # Quitar "Bearer"
        if not data:
            return jsonify({"mensaje": "Token inválido o expirado"}), 401

        request.cliente = data  # Pasar datos del cliente a la solicitud
        return func(*args, **kwargs)
    return envoltura
