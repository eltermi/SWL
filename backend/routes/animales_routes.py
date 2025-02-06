from flask import Blueprint, request, jsonify
from extensions import db
from models import Animales

animales_bp = Blueprint('animales', __name__)

# Obtener todos los animales
@animales_bp.route('/animales', methods=['GET'])
def obtener_animales():
    animales = Animales.query.all()
    return jsonify([{
        'id_animal': animal.id_animal,
        'id_cliente': animal.id_cliente,
        'tipo_animal': animal.tipo_animal,
        'nombre': animal.nombre,
        'edad': animal.edad,
        'medicacion': animal.medicacion
    } for animal in animales])

# Crear un nuevo animal
@animales_bp.route('/animales', methods=['POST'])
def crear_animal():
    datos = request.json
    nuevo_animal = Animales(
        id_cliente=datos['id_cliente'],
        tipo_animal=datos['tipo_animal'],
        nombre=datos['nombre'],
        edad=datos.get('edad'),
        medicacion=datos.get('medicacion')
    )
    db.session.add(nuevo_animal)
    db.session.commit()
    return jsonify({'mensaje': 'Animal creado exitosamente'}), 201

# Obtener un animal por ID
@animales_bp.route('/animales/<int:id_animal>', methods=['GET'])
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

# Actualizar un animal
@animales_bp.route('/animales/<int:id_animal>', methods=['PUT'])
def actualizar_animal(id_animal):
    animal = Animales.query.get_or_404(id_animal)
    datos = request.json
    animal.tipo_animal = datos.get('tipo_animal', animal.tipo_animal)
    animal.nombre = datos.get('nombre', animal.nombre)
    animal.edad = datos.get('edad', animal.edad)
    animal.medicacion = datos.get('medicacion', animal.medicacion)
    db.session.commit()
    return jsonify({'mensaje': 'Animal actualizado exitosamente'})

# Eliminar un animal
@animales_bp.route('/animales/<int:id_animal>', methods=['DELETE'])
def eliminar_animal(id_animal):
    animal = Animales.query.get_or_404(id_animal)
    db.session.delete(animal)
    db.session.commit()
    return jsonify({'mensaje': 'Animal eliminado exitosamente'})
