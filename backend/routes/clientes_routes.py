from flask import Blueprint, request, jsonify
from extensions import db
from models import Clientes
from utils.auth import requerir_autenticacion

clientes_bp = Blueprint('clientes', __name__)

@clientes_bp.route('/clientes', methods=['GET'])
@requerir_autenticacion
def obtener_clientes():
    filtro = request.args.get('buscar', '').strip()

    clientes = Clientes.obtener_clientes(filtro)

    return jsonify([{
        'id_cliente': cliente.id_cliente,
        'nombre': cliente.nombre,
        'apellidos': cliente.apellidos,
        'calle': cliente.calle,
        'codigo_postal': cliente.codigo_postal,
        'municipio': cliente.municipio,
        'telefono': cliente.telefono,
        'gatos': cliente.gatos,
        'ad_nombre': cliente.ad_nombre,
        'ad_apellidos': cliente.ad_apellidos,
        'ad_telefono': cliente.ad_telefono
    } for cliente in clientes])

# Crear un nuevo cliente
@clientes_bp.route('/clientes', methods=['POST'])
@requerir_autenticacion
def crear_cliente():
    datos = request.json
    nuevo_cliente = Clientes(
        nombre=datos['nombre'],
        apellidos=datos['apellidos'],
        calle=datos['calle'],
        piso=datos.get('piso'),
        codigo_postal=datos['codigo_postal'],
        municipio=datos['municipio'],
        pais=datos['pais'],
        nacionalidad=datos.get('nacionalidad'),
        idioma=datos.get('idioma'),
        genero=datos['genero'],
        referencia_origen=datos.get('referencia_origen'),
        email=datos.get('email'),
        telefono=datos.get('telefono')
    )
    db.session.add(nuevo_cliente)
    db.session.commit()
    return jsonify({'mensaje': 'Cliente creado exitosamente'}), 201

# Obtener un cliente por ID
@clientes_bp.route('/clientes/<int:id_cliente>', methods=['GET'])
@requerir_autenticacion
def obtener_cliente(id_cliente):
    cliente = Clientes.obtener_datos_cliente(id_cliente)
    return jsonify({
        'id_cliente': cliente.id_cliente,
        'nombre': cliente.nombre,
        'apellidos': cliente.apellidos,
        'calle': cliente.calle,
        'piso': cliente.piso,
        'codigo_postal':cliente.codigo_postal,
        'municipio':cliente.municipio,
        'pais': cliente.pais,
        'telefono': cliente.telefono,
        'email': cliente.email,
        'nacionalidad': cliente.nacionalidad,
        'idioma': cliente.idioma,
        'genero': cliente.genero,
        'referencia': cliente.referencia,
        'ad_nombre': cliente.ad_nombre,
        'ad_apellidos': cliente.ad_apellidos,
        'ad_telefono': cliente.ad_telefono,
        'ad_email': cliente.ad_email
    })

# Actualizar un cliente
@clientes_bp.route('/clientes/<int:id_cliente>', methods=['PUT'])
@requerir_autenticacion
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
@requerir_autenticacion
def eliminar_cliente(id_cliente):
    cliente = Clientes.query.get_or_404(id_cliente)
    db.session.delete(cliente)
    db.session.commit()
    return jsonify({'mensaje': 'Cliente eliminado exitosamente'})
