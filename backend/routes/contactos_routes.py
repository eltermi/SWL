from flask import Blueprint, request, jsonify
from sqlalchemy.exc import DataError, IntegrityError

from extensions import db
from models import Clientes, ContactosAdicionales
from utils.auth import requerir_autenticacion
from utils.db_errors import mensaje_error_persistencia
from utils.input_normalizers import normalizar_telefono

contactos_bp = Blueprint('contactos', __name__)


def _obtener_datos_contacto_request():
    if request.is_json:
        datos_json = request.get_json(silent=True)
        if isinstance(datos_json, dict):
            return datos_json
    return request.form.to_dict()


def _valor_texto_o_none(valor):
    if valor is None:
        return None
    valor_normalizado = str(valor).strip()
    return valor_normalizado or None


def _serializar_contacto(contacto):
    return {
        'id_contacto': contacto.id_contacto,
        'id_cliente': contacto.id_cliente,
        'nombre': contacto.nombre,
        'apellidos': contacto.apellidos,
        'telefono': contacto.telefono,
        'email': contacto.email,
        'nombre_cliente': getattr(contacto, 'nombre_cliente', None),
        'apellidos_cliente': getattr(contacto, 'apellidos_cliente', None)
    }


@contactos_bp.route('/contactos', methods=['GET'])
@requerir_autenticacion
def obtener_contactos():
    filtro = request.args.get('buscar', '').strip()
    contactos = ContactosAdicionales.obtener_contactos(filtro)
    return jsonify([_serializar_contacto(contacto) for contacto in contactos])


@contactos_bp.route('/contactos', methods=['POST'])
@requerir_autenticacion
def crear_contacto():
    datos = _obtener_datos_contacto_request()
    if not isinstance(datos, dict):
        return jsonify({'mensaje': 'Formato de datos no válido para crear contacto.'}), 400

    nombre = _valor_texto_o_none(datos.get('nombre'))
    if nombre is None:
        return jsonify({'mensaje': "El campo 'nombre' es obligatorio."}), 400

    id_cliente = datos.get('id_cliente')
    try:
        id_cliente = int(id_cliente)
    except (TypeError, ValueError):
        return jsonify({'mensaje': "El campo 'id_cliente' es obligatorio y debe ser válido."}), 400

    if Clientes.query.get(id_cliente) is None:
        return jsonify({'mensaje': 'El cliente seleccionado no existe.'}), 400

    try:
        telefono = normalizar_telefono(datos.get('telefono'))
    except ValueError as error:
        return jsonify({'mensaje': str(error)}), 400

    nuevo_contacto = ContactosAdicionales(
        id_cliente=id_cliente,
        nombre=nombre,
        apellidos=_valor_texto_o_none(datos.get('apellidos')),
        telefono=telefono,
        email=_valor_texto_o_none(datos.get('email'))
    )

    try:
        db.session.add(nuevo_contacto)
        db.session.commit()
    except (DataError, IntegrityError) as error:
        db.session.rollback()
        return jsonify({'mensaje': mensaje_error_persistencia(error)}), 400

    return jsonify({'mensaje': 'Contacto creado exitosamente', 'id_contacto': nuevo_contacto.id_contacto}), 201


@contactos_bp.route('/contactos/<int:id_contacto>', methods=['GET'])
@requerir_autenticacion
def obtener_contacto(id_contacto):
    contacto = db.session.query(
        ContactosAdicionales.id_contacto,
        ContactosAdicionales.id_cliente,
        ContactosAdicionales.nombre,
        ContactosAdicionales.apellidos,
        ContactosAdicionales.telefono,
        ContactosAdicionales.email,
        Clientes.nombre.label('nombre_cliente'),
        Clientes.apellidos.label('apellidos_cliente')
    ).outerjoin(
        Clientes, Clientes.id_cliente == ContactosAdicionales.id_cliente
    ).filter(
        ContactosAdicionales.id_contacto == id_contacto
    ).first()

    if contacto is None:
        return jsonify({'mensaje': 'Contacto no encontrado'}), 404

    return jsonify(_serializar_contacto(contacto))


@contactos_bp.route('/contactos/<int:id_contacto>', methods=['PUT'])
@requerir_autenticacion
def actualizar_contacto(id_contacto):
    contacto = ContactosAdicionales.query.get_or_404(id_contacto)
    datos = _obtener_datos_contacto_request()
    if not isinstance(datos, dict):
        return jsonify({'mensaje': 'Formato de datos no válido para actualizar contacto.'}), 400

    if 'nombre' in datos:
        nombre = _valor_texto_o_none(datos.get('nombre'))
        if nombre is None:
            return jsonify({'mensaje': "El campo 'nombre' es obligatorio."}), 400
        contacto.nombre = nombre

    if 'id_cliente' in datos:
        try:
            id_cliente = int(datos.get('id_cliente'))
        except (TypeError, ValueError):
            return jsonify({'mensaje': "El campo 'id_cliente' debe ser válido."}), 400
        if Clientes.query.get(id_cliente) is None:
            return jsonify({'mensaje': 'El cliente seleccionado no existe.'}), 400
        contacto.id_cliente = id_cliente

    if 'apellidos' in datos:
        contacto.apellidos = _valor_texto_o_none(datos.get('apellidos'))
    if 'telefono' in datos:
        try:
            contacto.telefono = normalizar_telefono(datos.get('telefono'))
        except ValueError as error:
            return jsonify({'mensaje': str(error)}), 400
    if 'email' in datos:
        contacto.email = _valor_texto_o_none(datos.get('email'))

    try:
        db.session.commit()
    except (DataError, IntegrityError) as error:
        db.session.rollback()
        return jsonify({'mensaje': mensaje_error_persistencia(error)}), 400

    return jsonify({'mensaje': 'Contacto actualizado exitosamente'})


@contactos_bp.route('/contactos/<int:id_contacto>', methods=['DELETE'])
@requerir_autenticacion
def eliminar_contacto(id_contacto):
    contacto = ContactosAdicionales.query.get_or_404(id_contacto)
    db.session.delete(contacto)
    db.session.commit()
    return jsonify({'mensaje': 'Contacto eliminado exitosamente'})
