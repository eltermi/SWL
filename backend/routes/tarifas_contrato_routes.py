# routes/tarifas_contrato_routes.py
from flask import Blueprint, request, jsonify
from extensions import db
from models import TarifasContrato

tarifas_contrato_bp = Blueprint('tarifas_contrato', __name__)

@tarifas_contrato_bp.route('/tarifas_contrato', methods=['GET'])
def obtener_tarifas_contrato():
    tarifas_contrato = TarifasContrato.query.all()
    return jsonify([{
        'id_tarifa_contrato': tc.id_tarifa_contrato,
        'id_contrato': tc.id_contrato,
        'id_tarifa': tc.id_tarifa
    } for tc in tarifas_contrato])

@tarifas_contrato_bp.route('/tarifas_contrato', methods=['POST'])
def crear_tarifa_contrato():
    datos = request.json
    nueva_tarifa_contrato = TarifasContrato(**datos)
    db.session.add(nueva_tarifa_contrato)
    db.session.commit()
    return jsonify({'mensaje': 'Tarifa de contrato creada exitosamente'}), 201