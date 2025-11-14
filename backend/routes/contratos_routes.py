from flask import Blueprint, request, jsonify
from extensions import db
from models import Contratos, TarifasContrato
from datetime import date
from utils.auth import requerir_autenticacion

contratos_bp = Blueprint('contratos', __name__)

# Obtener todos los contratos
@contratos_bp.route('/contratos', methods=['GET'])
def obtener_contratos():
    contratos = Contratos.query.all()
    return jsonify([{
        'id_contrato': contrato.id_contrato,
        'id_cliente': contrato.id_cliente,
        'fecha_inicio': contrato.fecha_inicio,
        'fecha_fin': contrato.fecha_fin,
        'numero_visitas_diarias': contrato.numero_visitas_diarias,
        'horario_visitas': contrato.horario_visitas,
        'pago_adelantado': contrato.pago_adelantado,
        'estado_pago_adelantado': contrato.estado_pago_adelantado,
        'pago_final': contrato.pago_final,
        'estado_pago_final': contrato.estado_pago_final
    } for contrato in contratos])

# Crear un nuevo contrato
@contratos_bp.route('/contratos', methods=['POST'])
def crear_contrato():
    datos = request.json
    try:
        id_tarifa = int(datos.get('id_tarifa'))
    except (TypeError, ValueError):
        return jsonify({'mensaje': 'La tarifa seleccionada no es válida'}), 400

    nuevo_contrato = Contratos(
        id_cliente=datos['id_cliente'],
        fecha_inicio=datos['fecha_inicio'],
        fecha_fin=datos['fecha_fin'],
        numero_visitas_diarias=datos['numero_visitas_diarias'],
        horario_visitas=datos['horario_visitas'],
        pago_adelantado=datos['pago_adelantado'],
        estado_pago_adelantado=datos['estado_pago_adelantado'],
        pago_final=datos['pago_final'],
        estado_pago_final=datos['estado_pago_final'],
        observaciones=datos['observaciones']
    )
    db.session.add(nuevo_contrato)
    db.session.flush()

    nueva_tarifa_contrato = TarifasContrato(
        id_contrato=nuevo_contrato.id_contrato,
        id_tarifa=id_tarifa
    )
    db.session.add(nueva_tarifa_contrato)
    db.session.commit()
    return jsonify({'mensaje': 'Contrato creado exitosamente'}), 201

# Obtener un contrato por ID
@contratos_bp.route('/contratos/<int:id_contrato>', methods=['GET'])
def obtener_contrato(id_contrato):
    contrato = Contratos.obtener_contrato(id_contrato)
    if contrato is None:
        return jsonify({'mensaje': 'Contrato no encontrado'}), 404
    return jsonify(contrato)

@contratos_bp.route('/dashboard/contratos_activos', methods=['GET'])
def obtener_contratos_activos():
    contratos = Contratos.obtener_contratos_activos()

    # Convertir a formato JSON-serializable
    contratos_json = {}
    for dia, lista_contratos in contratos.items():
        contratos_json[dia] = []
        for c in lista_contratos:contratos_json[dia].append({
        'id_contrato': int(c['id_contrato']),
        'id_cliente': int(c['id_cliente']),
        'fecha_inicio': str(c['fecha_inicio']),
        'fecha_fin': str(c['fecha_fin']),
        'visitas': int(c['visitas']),
        'horario': c['horario'],
        'tarifa': c['tarifa'],
        'nombre_animales': c['nombre_animales'],
        'estado_pago_adelantado': c['estado_pago_adelantado'],
        'estado_pago_final': c['estado_pago_final']
    })

    return jsonify(contratos_json)

# Actualizar un contrato
@contratos_bp.route('/contratos/<int:id_contrato>', methods=['PUT'])
def actualizar_contrato(id_contrato):
    contrato = Contratos.query.get_or_404(id_contrato)
    datos = request.json
    contrato.fecha_inicio = datos.get('fecha_inicio', contrato.fecha_inicio)
    contrato.fecha_fin = datos.get('fecha_fin', contrato.fecha_fin)
    contrato.numero_visitas_diarias = datos.get('numero_visitas_diarias', contrato.numero_visitas_diarias)
    contrato.horario_visitas = datos.get('horario_visitas', contrato.horario_visitas)
    contrato.pago_adelantado = datos.get('pago_adelantado', contrato.pago_adelantado)
    contrato.estado_pago_adelantado = datos.get('estado_pago_adelantado', contrato.estado_pago_adelantado)
    contrato.pago_final = datos.get('pago_final', contrato.pago_final)
    contrato.estado_pago_final = datos.get('estado_pago_final', contrato.estado_pago_final)
    db.session.commit()
    return jsonify({'mensaje': 'Contrato actualizado exitosamente'})

# Eliminar un contrato
@contratos_bp.route('/contratos/<int:id_contrato>', methods=['DELETE'])
def eliminar_contrato(id_contrato):
    contrato = Contratos.query.get_or_404(id_contrato)
    db.session.delete(contrato)
    db.session.commit()
    return jsonify({'mensaje': 'Contrato eliminado exitosamente'})
