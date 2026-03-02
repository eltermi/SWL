from flask import Blueprint, request, jsonify
from sqlalchemy.exc import DataError, IntegrityError
from extensions import db
from models import Animales
from utils.auth import requerir_autenticacion
from utils.db_errors import mensaje_error_persistencia

animales_bp = Blueprint('animales', __name__)


def _normalizar_anio_nacimiento(valor):
    if valor is None:
        return None

    if isinstance(valor, int):
        return valor

    valor_texto = str(valor).strip()
    if valor_texto == "":
        return None

    try:
        return int(valor_texto)
    except ValueError:
        raise ValueError("El año de nacimiento debe ser un número entero o vacío.")

# Obtener todos los animales
@animales_bp.route('/animales', methods=['GET'])
@requerir_autenticacion
def obtener_animales():
    filtro = request.args.get('buscar', '').strip()

    animales = Animales.obtener_animales(filtro)
    return jsonify([{
        'id_animal': animal['id_animal'],
        'id_cliente': animal['id_cliente'],
        'nombre_animal': animal['nombre_animal'],
        'nombre_cliente': animal['nombre_cliente'],
        'apellidos_cliente': animal['apellidos_cliente'],
        'tipo_animal': animal['tipo_animal'],
        'edad': animal['edad'],
        'medicacion': animal['medicacion'], 
        'foto': animal['foto']
    } for animal in animales])

# Crear un nuevo animal
@animales_bp.route('/animales', methods=['POST'])
@requerir_autenticacion
def crear_animal(): 
    datos = request.form
    archivo = request.files.get('foto')
    try:
        anio_nacimiento = _normalizar_anio_nacimiento(datos.get('edad'))
    except ValueError as error:
        return jsonify({'mensaje': str(error)}), 400

    nuevo_animal = Animales(
        id_cliente=datos['id_cliente'],
        tipo_animal=datos['tipo_animal'],
        nombre=datos['nombre'],
        edad=anio_nacimiento,
        medicacion=datos.get('medicacion'),
        foto=archivo.read() if archivo else None
    )
    try:
        db.session.add(nuevo_animal)
        db.session.commit()
    except (DataError, IntegrityError) as error:
        db.session.rollback()
        return jsonify({'mensaje': mensaje_error_persistencia(error)}), 400

    return jsonify({'mensaje': 'Animal creado exitosamente'}), 201

# Obtener un animal por ID
@animales_bp.route('/animales/<int:id_animal>', methods=['GET'])
@requerir_autenticacion
def obtener_animal(id_animal):
    animal = Animales.query.get_or_404(id_animal)
    return jsonify({
        'id_animal': animal.id_animal,
        'id_cliente': animal.id_cliente,
        'tipo_animal': animal.tipo_animal,
        'nombre': animal.nombre,
        'edad': animal.edad,
        'medicacion': animal.medicacion
    })

# Obtener animales de un cliente
@animales_bp.route('/animales/cliente/<int:id_cliente>', methods=['GET'])
@requerir_autenticacion
def obtener_animal_cliente(id_cliente):
    animales = Animales.obtener_animal_cliente(id_cliente)
    print(jsonify(animales))
    return jsonify(animales), 200


# Actualizar un animal
@animales_bp.route('/animales/<int:id_animal>', methods=['PUT'])
@requerir_autenticacion
def actualizar_animal(id_animal):
    animal = Animales.query.get_or_404(id_animal)
    datos = request.get_json(silent=True) or {}
    try:
        anio_nacimiento = _normalizar_anio_nacimiento(datos.get('edad', animal.edad))
    except ValueError as error:
        return jsonify({'mensaje': str(error)}), 400

    animal.tipo_animal = datos.get('tipo_animal', animal.tipo_animal)
    animal.nombre = datos.get('nombre', animal.nombre)
    animal.edad = anio_nacimiento
    animal.medicacion = datos.get('medicacion', animal.medicacion)
    try:
        db.session.commit()
    except (DataError, IntegrityError) as error:
        db.session.rollback()
        return jsonify({'mensaje': mensaje_error_persistencia(error)}), 400

    return jsonify({'mensaje': 'Animal actualizado exitosamente'})

# Eliminar un animal
@animales_bp.route('/animales/<int:id_animal>', methods=['DELETE'])
@requerir_autenticacion
def eliminar_animal(id_animal):
    animal = Animales.query.get_or_404(id_animal)
    db.session.delete(animal)
    db.session.commit()
    return jsonify({'mensaje': 'Animal eliminado exitosamente'})
