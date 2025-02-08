import jwt
from datetime import datetime, timedelta
from flask import request, jsonify
from functools import wraps

SECRET_KEY = "TuClaveSecretaSegura"  # Cambia esto a una clave segura

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
    :return: Información decodificada si es válido o None si es inválido
    """
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return decoded["data"]
    except jwt.ExpiredSignatureError:
        return None  # Token expirado
    except jwt.InvalidTokenError:
        return None  # Token inválido

def requerir_autenticacion(func):
    @wraps(func)
    def envoltura(*args, **kwargs):
        token = request.headers.get("Authorization")
        print(f"🔍 Token recibido en backend: {token}")  # <-- Depuración
        print(request.headers)

        if not token or not token.startswith("Bearer "):
            return jsonify({"mensaje": "Token no proporcionado o formato incorrecto"}), 401

        token = token.split(" ")[1]  # Eliminar "Bearer "
        data = verificar_token(token)

        if not data:
            print("❌ Token inválido o expirado")  # <-- Depuración
            return jsonify({"mensaje": "Token inválido o expirado"}), 401

        request.usuario = data
        return func(*args, **kwargs)
    return envoltura