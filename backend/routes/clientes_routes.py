import base64
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import DataError, IntegrityError
from extensions import db
from models import Clientes, Contratos
from utils.auth import requerir_autenticacion
from utils.db_errors import mensaje_error_persistencia
from utils.input_normalizers import normalizar_telefono

clientes_bp = Blueprint('clientes', __name__)
MAX_WHATSAPP_AVATAR_BYTES = 2 * 1024 * 1024
PAIS_CLIENTE_DEFAULT = "Luxembourg"


def _detectar_mime_imagen(contenido):
    if not contenido:
        return "image/jpeg"
    if contenido.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if contenido.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if contenido.startswith(b"GIF87a") or contenido.startswith(b"GIF89a"):
        return "image/gif"
    if contenido.startswith(b"RIFF") and contenido[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _serializar_avatar(contenido):
    if not contenido:
        return None
    mime = _detectar_mime_imagen(contenido)
    avatar_base64 = base64.b64encode(contenido).decode("utf-8")
    return f"data:{mime};base64,{avatar_base64}"


def _leer_whatsapp_avatar_desde_form():
    archivo = request.files.get("whatsapp_avatar")
    if not archivo or not archivo.filename:
        raise ValueError("No se ha enviado ninguna imagen para el avatar.")

    mimetype = (archivo.mimetype or "").lower()
    if not mimetype.startswith("image/"):
        raise ValueError("El avatar de WhatsApp debe ser una imagen válida.")

    contenido = archivo.read()
    if not contenido:
        raise ValueError("La imagen del avatar está vacía.")
    if len(contenido) > MAX_WHATSAPP_AVATAR_BYTES:
        raise ValueError("La imagen del avatar supera el máximo de 2 MB.")
    return contenido


def _obtener_datos_cliente_request():
    if request.is_json:
        datos_json = request.get_json(silent=True)
        if isinstance(datos_json, dict):
            return datos_json
    return request.form.to_dict()


def _leer_whatsapp_avatar_opcional():
    archivo = request.files.get("whatsapp_avatar")
    if not archivo or not archivo.filename:
        return None, False
    return _leer_whatsapp_avatar_desde_form(), True


def _valor_texto_o_none(valor):
    if valor is None:
        return None
    valor_normalizado = str(valor).strip()
    return valor_normalizado or None


def _validar_genero(valor):
    genero = _valor_texto_o_none(valor)
    if genero is None:
        return None
    if genero not in ('M', 'F'):
        raise ValueError("El campo 'genero' solo puede estar vacío o tener el valor 'M' o 'F'.")
    return genero


def _es_true(valor):
    return str(valor or '').strip().lower() in ('1', 'true', 'si', 'sí', 'on')

@clientes_bp.route('/clientes', methods=['GET'])
@requerir_autenticacion
def obtener_clientes():
    filtro = request.args.get('buscar', '').strip()
    incluir_fallecidos = _es_true(request.args.get('incluir_fallecidos'))

    clientes = Clientes.obtener_clientes(filtro, incluir_fallecidos=incluir_fallecidos)

    return jsonify([{
        'id_cliente': cliente.id_cliente,
        'nombre': cliente.nombre,
        'apellidos': cliente.apellidos,
        'calle': cliente.calle,
        'codigo_postal': cliente.codigo_postal,
        'municipio': cliente.municipio,
        'telefono': cliente.telefono,
        'gatos': cliente.gatos,
        'solo_fallecidos': bool(cliente.tiene_animales) and not bool(cliente.tiene_animales_vivos),
        'ad_nombre': cliente.ad_nombre,
        'ad_apellidos': cliente.ad_apellidos,
        'ad_telefono': cliente.ad_telefono
    } for cliente in clientes])

# Crear un nuevo cliente
@clientes_bp.route('/clientes', methods=['POST'])
@requerir_autenticacion
def crear_cliente():
    datos = _obtener_datos_cliente_request()
    if not isinstance(datos, dict):
        return jsonify({'mensaje': 'Formato de datos no válido para crear cliente.'}), 400

    nombre = _valor_texto_o_none(datos.get('nombre'))
    if nombre is None:
        return jsonify({'mensaje': "El campo 'nombre' es obligatorio."}), 400

    try:
        telefono = normalizar_telefono(datos.get('telefono'))
        genero = _validar_genero(datos.get('genero'))
    except ValueError as error:
        return jsonify({'mensaje': str(error)}), 400
    try:
        avatar, _ = _leer_whatsapp_avatar_opcional()
    except ValueError as error:
        return jsonify({'mensaje': str(error)}), 400

    nuevo_cliente = Clientes(
        nombre=nombre,
        apellidos=_valor_texto_o_none(datos.get('apellidos')),
        calle=_valor_texto_o_none(datos.get('calle')),
        piso=_valor_texto_o_none(datos.get('piso')),
        codigo_postal=_valor_texto_o_none(datos.get('codigo_postal')),
        municipio=_valor_texto_o_none(datos.get('municipio')),
        pais=_valor_texto_o_none(datos.get('pais')) or PAIS_CLIENTE_DEFAULT,
        nacionalidad=_valor_texto_o_none(datos.get('nacionalidad')),
        idioma=_valor_texto_o_none(datos.get('idioma')),
        genero=genero,
        referencia_origen=_valor_texto_o_none(datos.get('referencia_origen')),
        email=_valor_texto_o_none(datos.get('email')),
        telefono=telefono,
        whatsapp_avatar=avatar
    )
    try:
        db.session.add(nuevo_cliente)
        db.session.flush()
        id_cliente_nuevo = nuevo_cliente.id_cliente
        db.session.commit()
    except (DataError, IntegrityError) as error:
        db.session.rollback()
        return jsonify({'mensaje': mensaje_error_persistencia(error)}), 400

    return jsonify({
        'mensaje': 'Cliente creado exitosamente',
        'id_cliente': id_cliente_nuevo
    }), 201

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
        'whatsapp_avatar': _serializar_avatar(cliente.whatsapp_avatar),
        'ad_nombre': cliente.ad_nombre,
        'ad_apellidos': cliente.ad_apellidos,
        'ad_telefono': cliente.ad_telefono,
        'ad_email': cliente.ad_email
    })

@clientes_bp.route('/clientes/<int:id_cliente>/contratos', methods=['GET'])
@requerir_autenticacion
def obtener_contratos_cliente(id_cliente):
    contratos = Contratos.obtener_contratos_cliente(id_cliente)
    return jsonify(contratos)

# Actualizar un cliente
@clientes_bp.route('/clientes/<int:id_cliente>', methods=['PUT'])
@requerir_autenticacion
def actualizar_cliente(id_cliente):
    cliente = Clientes.query.get_or_404(id_cliente)
    datos = _obtener_datos_cliente_request()
    if not isinstance(datos, dict):
        return jsonify({'mensaje': 'Formato de datos no válido para actualizar cliente.'}), 400
    if 'nombre' in datos:
        nombre = _valor_texto_o_none(datos.get('nombre'))
        if nombre is None:
            return jsonify({'mensaje': "El campo 'nombre' es obligatorio."}), 400
        cliente.nombre = nombre
    if 'apellidos' in datos:
        cliente.apellidos = _valor_texto_o_none(datos.get('apellidos'))
    if 'calle' in datos:
        cliente.calle = _valor_texto_o_none(datos.get('calle'))
    if 'piso' in datos:
        cliente.piso = _valor_texto_o_none(datos.get('piso'))
    if 'codigo_postal' in datos:
        cliente.codigo_postal = _valor_texto_o_none(datos.get('codigo_postal'))
    if 'municipio' in datos:
        cliente.municipio = _valor_texto_o_none(datos.get('municipio'))
    if 'pais' in datos:
        cliente.pais = _valor_texto_o_none(datos.get('pais'))
    if 'telefono' in datos:
        try:
            cliente.telefono = normalizar_telefono(datos.get('telefono'))
        except ValueError as error:
            return jsonify({'mensaje': str(error)}), 400
    if 'email' in datos:
        cliente.email = _valor_texto_o_none(datos.get('email'))
    if 'nacionalidad' in datos:
        cliente.nacionalidad = _valor_texto_o_none(datos.get('nacionalidad'))
    if 'idioma' in datos:
        cliente.idioma = _valor_texto_o_none(datos.get('idioma'))
    if 'genero' in datos:
        try:
            cliente.genero = _validar_genero(datos.get('genero'))
        except ValueError as error:
            return jsonify({'mensaje': str(error)}), 400
    if 'referencia_origen' in datos:
        cliente.referencia_origen = _valor_texto_o_none(datos.get('referencia_origen'))
    eliminar_avatar = str(datos.get('eliminar_whatsapp_avatar', '')).strip().lower() in ('1', 'true', 'si', 'sí', 'on')
    avatar_actualizado = False
    avatar_eliminado = False
    avatar_archivo_recibido = False
    if eliminar_avatar:
        cliente.whatsapp_avatar = None
        avatar_eliminado = True
    else:
        try:
            avatar_opcional, avatar_archivo_recibido = _leer_whatsapp_avatar_opcional()
        except ValueError as error:
            return jsonify({'mensaje': str(error)}), 400
        if avatar_opcional is not None:
            cliente.whatsapp_avatar = avatar_opcional
            avatar_actualizado = True
    try:
        db.session.commit()
    except (DataError, IntegrityError) as error:
        db.session.rollback()
        return jsonify({'mensaje': mensaje_error_persistencia(error)}), 400

    return jsonify({
        'mensaje': 'Cliente actualizado exitosamente',
        'avatar_actualizado': avatar_actualizado,
        'avatar_eliminado': avatar_eliminado,
        'avatar_archivo_recibido': avatar_archivo_recibido
    })


@clientes_bp.route('/clientes/<int:id_cliente>/whatsapp_avatar', methods=['PUT', 'POST'])
@requerir_autenticacion
def actualizar_whatsapp_avatar_cliente(id_cliente):
    cliente = Clientes.query.get_or_404(id_cliente)

    try:
        avatar = _leer_whatsapp_avatar_desde_form()
    except ValueError as error:
        return jsonify({'mensaje': str(error)}), 400

    cliente.whatsapp_avatar = avatar
    try:
        db.session.commit()
    except (DataError, IntegrityError) as error:
        db.session.rollback()
        return jsonify({'mensaje': mensaje_error_persistencia(error)}), 400

    return jsonify({'mensaje': 'Avatar de WhatsApp actualizado exitosamente'})


@clientes_bp.route('/clientes/<int:id_cliente>/whatsapp_avatar', methods=['DELETE'])
@requerir_autenticacion
def eliminar_whatsapp_avatar_cliente(id_cliente):
    cliente = Clientes.query.get_or_404(id_cliente)
    cliente.whatsapp_avatar = None
    try:
        db.session.commit()
    except (DataError, IntegrityError) as error:
        db.session.rollback()
        return jsonify({'mensaje': mensaje_error_persistencia(error)}), 400
    return jsonify({'mensaje': 'Avatar de WhatsApp eliminado exitosamente'})

# Eliminar un cliente
@clientes_bp.route('/clientes/<int:id_cliente>', methods=['DELETE'])
@requerir_autenticacion
def eliminar_cliente(id_cliente):
    cliente = Clientes.query.get_or_404(id_cliente)
    db.session.delete(cliente)
    db.session.commit()
    return jsonify({'mensaje': 'Cliente eliminado exitosamente'})
