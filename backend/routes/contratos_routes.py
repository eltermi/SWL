from flask import Blueprint, request, jsonify
from extensions import db
from models import Contratos
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
    nuevo_contrato = Contratos(
        id_cliente=datos['id_cliente'],
        fecha_inicio=datos['fecha_inicio'],
        fecha_fin=datos['fecha_fin'],
        numero_visitas_diarias=datos['numero_visitas_diarias'],
        horario_visitas=datos['horario_visitas'],
        pago_adelantado=datos['pago_adelantado'],
        estado_pago_adelantado=datos['estado_pago_adelantado'],
        pago_final=datos['pago_final'],
        estado_pago_final=datos['estado_pago_final']
    )
    db.session.add(nuevo_contrato)
    db.session.commit()
    return jsonify({'mensaje': 'Contrato creado exitosamente'}), 201

# Obtener un contrato por ID
@contratos_bp.route('/contratos/<int:id_contrato>', methods=['GET'])
def obtener_contrato(id_contrato):
    contrato = Contratos.query.get_or_404(id_contrato)
    return jsonify({
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
    })

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


@contratos_bp.route('/contratos/activos', methods=['GET'])
@requerir_autenticacion
def obtener_contratos_activos():
    """
    Devuelve todos los contratos con fecha_fin igual o superior a hoy.
    """
    hoy = date.today()
    contratos = Contratos.query.filter(Contratos.fecha_fin >= hoy).all()

    resultado = [
        {
            "id_contrato": contrato.id_contrato,
            "id_cliente": contrato.id_cliente,
            "fecha_inicio": contrato.fecha_inicio.strftime("%Y-%m-%d"),
            "fecha_fin": contrato.fecha_fin.strftime("%Y-%m-%d"),
            "numero_visitas_diarias": contrato.numero_visitas_diarias,
            "horario_visitas": contrato.horario_visitas,
            "pago_adelantado": contrato.pago_adelantado,
            "estado_pago_adelantado": contrato.estado_pago_adelantado,
            "pago_final": contrato.pago_final,
            "estado_pago_final": contrato.estado_pago_final,
        }
        for contrato in contratos
    ]

    return jsonify(resultado), 200