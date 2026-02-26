# routes/contactos_routes.py
from flask import Blueprint, request, jsonify
from extensions import db
from models import ContactosAdicionales
from utils.auth import requerir_autenticacion

contactos_bp = Blueprint('contactos', __name__)

# Obtener todos los contactos adicionales
@contactos_bp.route('/contactos', methods=['GET'])
@requerir_autenticacion
def obtener_contactos():
    contactos = ContactosAdicionales.query.all()
    return jsonify([{
        'id_contacto': contacto.id_contacto,
        'nombre': contacto.nombre,
        'apellidos': contacto.apellidos,
        'id_cliente': contacto.id_cliente,
        'telefono': contacto.telefono,
        'email': contacto.email
    } for contacto in contactos])

# Crear un nuevo contacto adicional
@contactos_bp.route('/contactos', methods=['POST'])
@requerir_autenticacion
def crear_contacto():
    datos = request.json
    nuevo_contacto = ContactosAdicionales(**datos)
    db.session.add(nuevo_contacto)
    db.session.commit()
    return jsonify({'mensaje': 'Contacto creado exitosamente'}), 201
