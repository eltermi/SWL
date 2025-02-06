from flask import Blueprint, request, jsonify
from extensions import db
from models import Clientes
from utils.auth import requerir_autenticacion

clientes_bp = Blueprint('clientes', __name__)

@clientes_bp.route('/clientes', methods=['GET'])
def obtener_clientes():
    clientes = Clientes.query.all()
    return jsonify([{
        'id_cliente': cliente.id_cliente,
        'nombre': cliente.nombre,
        'apellidos': cliente.apellidos,
        'email': cliente.email
    } for cliente in clientes])

# Crear un nuevo cliente
@clientes_bp.route('/clientes', methods=['POST'])
def crear_cliente():
    datos = request.json
    nuevo_cliente = Clientes(
        nombre=datos['nombre'],
        apellidos=datos['apellidos'],
        email=datos.get('email'),
        telefono=datos.get('telefono')
    )
    db.session.add(nuevo_cliente)
    db.session.commit()
    return jsonify({'mensaje': 'Cliente creado exitosamente'}), 201

# Obtener un cliente por ID
@clientes_bp.route('/clientes/<int:id_cliente>', methods=['GET'])
def obtener_cliente(id_cliente):
    cliente = Clientes.query.get_or_404(id_cliente)
    return jsonify({
        'id_cliente': cliente.id_cliente,
        'nombre': cliente.nombre,
        'apellidos': cliente.apellidos,
        'email': cliente.email
    })

# Actualizar un cliente
@clientes_bp.route('/clientes/<int:id_cliente>', methods=['PUT'])
def actualizar_cliente(id_cliente):
    cliente = Clientes.query.get_or_404(id_cliente)
    datos = request.json
    cliente.nombre = datos.get('nombre', cliente.nombre)
    cliente.apellidos = datos.get('apellidos', cliente.apellidos)
    cliente.email = datos.get('email', cliente.email)
    cliente.telefono = datos.get('telefono', cliente.telefono)
    db.session.commit()
    return jsonify({'mensaje': 'Cliente actualizado exitosamente'})

# Eliminar un cliente
@clientes_bp.route('/clientes/<int:id_cliente>', methods=['DELETE'])
def eliminar_cliente(id_cliente):
    cliente = Clientes.query.get_or_404(id_cliente)
    db.session.delete(cliente)
    db.session.commit()
    return jsonify({'mensaje': 'Cliente eliminado exitosamente'})
