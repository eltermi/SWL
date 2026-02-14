from flask import Blueprint, request, jsonify
from extensions import db
from models import Contratos, TarifasContrato, Tarifas
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from utils.auth import requerir_autenticacion

contratos_bp = Blueprint('contratos', __name__)


def calcular_total_contrato(fecha_inicio, fecha_fin, numero_visitas_diarias):
    def normalizar_fecha(valor_fecha):
        if isinstance(valor_fecha, date):
            return valor_fecha
        if isinstance(valor_fecha, str):
            return datetime.strptime(valor_fecha, "%Y-%m-%d").date()
        raise ValueError("Formato de fecha no válido")

    inicio = normalizar_fecha(fecha_inicio)
    fin = normalizar_fecha(fecha_fin)
    if fin < inicio:
        raise ValueError("La fecha de fin no puede ser anterior a la fecha de inicio")

    visitas = int(numero_visitas_diarias)
    if visitas < 0:
        raise ValueError("El número de visitas diarias no puede ser negativo")

    dias = (fin - inicio).days + 1
    return Decimal(dias * visitas).quantize(Decimal("0.01"))


def parsear_pagado(valor):
    if valor is None or str(valor).strip() == "":
        return Decimal("0.00")
    try:
        return Decimal(str(valor).replace(",", ".")).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        raise ValueError("El valor de pagado no es válido")


def parsear_total(valor):
    if valor is None or str(valor).strip() == "":
        raise ValueError("El valor de total no es válido")
    try:
        total = Decimal(str(valor).replace(",", ".")).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        raise ValueError("El valor de total no es válido")
    if total < 0:
        raise ValueError("El valor de total no puede ser negativo")
    return total


def parsear_num_total_visitas(valor):
    if valor is None or str(valor).strip() == "":
        raise ValueError("El número total de visitas no es válido")
    try:
        numero_visitas = Decimal(str(valor).replace(",", "."))
    except (InvalidOperation, ValueError):
        raise ValueError("El número total de visitas no es válido")
    if numero_visitas < 0:
        raise ValueError("El número total de visitas no puede ser negativo")
    return numero_visitas


def formatear_num_total_visitas(numero_visitas):
    texto = format(numero_visitas, "f")
    if "." in texto:
        texto = texto.rstrip("0").rstrip(".")
    return texto or "0"


def calcular_num_total_visitas_desde_fechas(fecha_inicio, fecha_fin, numero_visitas_diarias):
    inicio = fecha_inicio if isinstance(fecha_inicio, date) else datetime.strptime(str(fecha_inicio), "%Y-%m-%d").date()
    fin = fecha_fin if isinstance(fecha_fin, date) else datetime.strptime(str(fecha_fin), "%Y-%m-%d").date()
    if fin < inicio:
        raise ValueError("La fecha de fin no puede ser anterior a la fecha de inicio")
    visitas_diarias = Decimal(str(numero_visitas_diarias))
    if visitas_diarias < 0:
        raise ValueError("El número de visitas diarias no puede ser negativo")
    dias = (fin - inicio).days + 1
    return Decimal(dias) * visitas_diarias


def calcular_total_desde_visitas_y_tarifa(num_total_visitas, id_tarifa):
    tarifa = Tarifas.query.get(id_tarifa)
    if not tarifa:
        raise ValueError("La tarifa seleccionada no existe")
    precio_tarifa = Decimal(str(tarifa.precio_base))
    return (num_total_visitas * precio_tarifa).quantize(Decimal("0.01"))

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
        'total': float(contrato.total or 0),
        'pagado': float(contrato.pagado or 0),
        'num_factura': contrato.num_factura,
        'num_total_visitas': contrato.num_total_visitas
    } for contrato in contratos])

# Crear un nuevo contrato
@contratos_bp.route('/contratos', methods=['POST'])
def crear_contrato():
    datos = request.json
    try:
        id_tarifa = int(datos.get('id_tarifa'))
    except (TypeError, ValueError):
        return jsonify({'mensaje': 'La tarifa seleccionada no es válida'}), 400
    try:
        num_total_visitas = parsear_num_total_visitas(datos.get('num_total_visitas'))
        total = calcular_total_desde_visitas_y_tarifa(num_total_visitas, id_tarifa)
        pagado = parsear_pagado(datos.get('pagado', 0))
    except (KeyError, ValueError) as error:
        return jsonify({'mensaje': str(error)}), 400

    nuevo_contrato = Contratos(
        id_cliente=datos['id_cliente'],
        fecha_inicio=datos['fecha_inicio'],
        fecha_fin=datos['fecha_fin'],
        numero_visitas_diarias=datos['numero_visitas_diarias'],
        horario_visitas=datos.get('horario_visitas') or {},
        total=total,
        pagado=pagado,
        num_total_visitas=formatear_num_total_visitas(num_total_visitas),
        observaciones=datos.get('observaciones')
    )
    db.session.add(nuevo_contrato)
    db.session.flush()

    nuevo_contrato.num_factura = f"{nuevo_contrato.id_contrato}-{nuevo_contrato.id_cliente}"

    nueva_tarifa_contrato = TarifasContrato(
        id_contrato=nuevo_contrato.id_contrato,
        id_tarifa=id_tarifa
    )
    db.session.add(nueva_tarifa_contrato)
    db.session.commit()
    return jsonify({
        'mensaje': 'Contrato creado exitosamente',
        'id_contrato': nuevo_contrato.id_contrato,
        'num_factura': nuevo_contrato.num_factura
    }), 201

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
        'total': c['total'],
        'pagado': c['pagado'],
        'num_factura': c['num_factura'],
        'num_total_visitas': c['num_total_visitas']
    })

    return jsonify(contratos_json)

@contratos_bp.route('/dashboard/contratos_programados', methods=['GET'])
def obtener_contratos_programados():
    contratos = Contratos.obtener_contratos_programados()
    return jsonify(contratos)

# Actualizar un contrato
@contratos_bp.route('/contratos/<int:id_contrato>', methods=['PUT'])
def actualizar_contrato(id_contrato):
    contrato = Contratos.query.get_or_404(id_contrato)
    datos = request.json
    contrato.fecha_inicio = datos.get('fecha_inicio', contrato.fecha_inicio)
    contrato.fecha_fin = datos.get('fecha_fin', contrato.fecha_fin)
    contrato.numero_visitas_diarias = datos.get('numero_visitas_diarias', contrato.numero_visitas_diarias)
    contrato.horario_visitas = datos.get('horario_visitas', contrato.horario_visitas)
    if 'observaciones' in datos:
        contrato.observaciones = datos.get('observaciones')
    id_tarifa_para_total = None
    if 'id_tarifa' in datos:
        try:
            id_tarifa_para_total = int(datos.get('id_tarifa'))
        except (TypeError, ValueError):
            return jsonify({'mensaje': 'La tarifa seleccionada no es válida'}), 400

        tarifa_contrato = TarifasContrato.query.filter_by(id_contrato=id_contrato).first()
        if tarifa_contrato:
            tarifa_contrato.id_tarifa = id_tarifa_para_total
        else:
            db.session.add(TarifasContrato(id_contrato=id_contrato, id_tarifa=id_tarifa_para_total))
    else:
        tarifa_contrato = TarifasContrato.query.filter_by(id_contrato=id_contrato).first()
        if tarifa_contrato and tarifa_contrato.id_tarifa is not None:
            id_tarifa_para_total = int(tarifa_contrato.id_tarifa)

    try:
        if 'num_total_visitas' in datos:
            num_total_visitas = parsear_num_total_visitas(datos.get('num_total_visitas'))
            contrato.num_total_visitas = formatear_num_total_visitas(num_total_visitas)
        else:
            if contrato.num_total_visitas is not None and str(contrato.num_total_visitas).strip() != "":
                num_total_visitas = parsear_num_total_visitas(contrato.num_total_visitas)
            else:
                num_total_visitas = calcular_num_total_visitas_desde_fechas(
                    contrato.fecha_inicio,
                    contrato.fecha_fin,
                    contrato.numero_visitas_diarias
                )
                contrato.num_total_visitas = formatear_num_total_visitas(num_total_visitas)

        if id_tarifa_para_total is not None:
            contrato.total = calcular_total_desde_visitas_y_tarifa(num_total_visitas, id_tarifa_para_total)
        elif 'total' in datos:
            contrato.total = parsear_total(datos.get('total'))
        else:
            contrato.total = calcular_total_contrato(
                contrato.fecha_inicio,
                contrato.fecha_fin,
                contrato.numero_visitas_diarias
            )

        if 'pagado' in datos:
            contrato.pagado = parsear_pagado(datos.get('pagado'))
    except ValueError as error:
        return jsonify({'mensaje': str(error)}), 400

    db.session.commit()
    return jsonify({'mensaje': 'Contrato actualizado exitosamente'})

# Eliminar un contrato
@contratos_bp.route('/contratos/<int:id_contrato>', methods=['DELETE'])
def eliminar_contrato(id_contrato):
    contrato = Contratos.query.get_or_404(id_contrato)
    db.session.delete(contrato)
    db.session.commit()
    return jsonify({'mensaje': 'Contrato eliminado exitosamente'})
