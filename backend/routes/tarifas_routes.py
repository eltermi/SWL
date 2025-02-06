from flask import Blueprint, request, jsonify
from extensions import db
from models import Tarifas
from utils.auth import requerir_autenticacion

tarifas_bp = Blueprint('tarifas', __name__)

@tarifas_bp.route('/tarifas', methods=['GET'])
def obtener_tarifas():
    tarifas = Tarifas.query.all()
    return jsonify([{
        'id_tarifa': tarifa.id_tarifa,
        'descripcion': tarifa.descripcion,
        'precio_base': str(tarifa.precio_base),
        'descuento_por_visita': str(tarifa.descuento_por_visita),
        'tarifa_adicional_por_animal': str(tarifa.tarifa_adicional_por_animal)
    } for tarifa in tarifas])