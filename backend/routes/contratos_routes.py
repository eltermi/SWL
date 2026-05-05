import hmac
import os
from flask import Blueprint, request, jsonify, Response
from sqlalchemy.exc import DataError, IntegrityError
from sqlalchemy import text
from extensions import db
from models import Contratos, TarifasContrato, Tarifas
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from utils.auth import requerir_autenticacion
from utils.db_errors import mensaje_error_persistencia

contratos_bp = Blueprint('contratos', __name__)
CALENDAR_FEED_TOKEN_ENV = "CALENDAR_FEED_TOKEN"


def _obtener_token_feed_calendario():
    token = os.environ.get(CALENDAR_FEED_TOKEN_ENV)
    if token is None:
        return None
    token_normalizado = token.strip()
    return token_normalizado or None


def _escapar_texto_ics(valor):
    if valor is None:
        return ""
    texto = str(valor)
    texto = texto.replace("\\", "\\\\")
    texto = texto.replace(";", r"\;")
    texto = texto.replace(",", r"\,")
    texto = texto.replace("\r\n", r"\n").replace("\n", r"\n").replace("\r", r"\n")
    return texto


def _plegar_linea_ics(linea, longitud=75):
    if len(linea) <= longitud:
        return [linea]
    fragmentos = [linea[:longitud]]
    resto = linea[longitud:]
    while resto:
        fragmentos.append(f" {resto[:longitud - 1]}")
        resto = resto[longitud - 1:]
    return fragmentos


def _formatear_linea_ics(clave, valor):
    return _plegar_linea_ics(f"{clave}:{valor}")


def _formatear_fecha_hora_ics(valor):
    if valor is None:
        return None
    return valor.strftime("%Y%m%dT%H%M%S")


def _construir_direccion_cliente(fila):
    linea_1_partes = [
        str(valor).strip()
        for valor in [fila.get("calle"), fila.get("piso")]
        if valor and str(valor).strip()
    ]
    linea_2_partes = [
        str(valor).strip()
        for valor in [fila.get("codigo_postal"), fila.get("municipio")]
        if valor and str(valor).strip()
    ]
    lineas = []
    if linea_1_partes:
        lineas.append(", ".join(linea_1_partes))
    if linea_2_partes:
        lineas.append(" ".join(linea_2_partes))
    return "\n".join(lineas)


def _normalizar_tipo_animal(valor):
    if valor is None:
        return ""
    return str(valor).strip().lower()


def _formatear_lista_natural(elementos):
    items = [str(item).strip() for item in elementos if item and str(item).strip()]
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} y {items[1]}"
    return f"{', '.join(items[:-1])} y {items[-1]}"


def _deserializar_animales_calendario(valor):
    if not valor:
        return []

    animales = []
    for item in str(valor).split("||"):
        if not item:
            continue
        partes = item.split("::", 2)
        if len(partes) != 3:
            continue
        id_animal, tipo_animal, nombre = partes
        try:
            id_animal_int = int(id_animal)
        except (TypeError, ValueError):
            continue
        nombre_limpio = str(nombre).strip()
        if not nombre_limpio:
            continue
        animales.append({
            "id_animal": id_animal_int,
            "tipo_animal": _normalizar_tipo_animal(tipo_animal),
            "nombre": nombre_limpio,
        })
    return animales


def _construir_resumen_contrato(fila):
    animales = _deserializar_animales_calendario(fila.get("animales_calendario"))
    gatos = [animal["nombre"] for animal in animales if animal["tipo_animal"] == "gato"]
    perros = [animal["nombre"] for animal in animales if animal["tipo_animal"] == "perro"]

    if gatos:
        return f"CS - {_formatear_lista_natural(gatos[:3])}"
    if perros:
        return f"DB - {perros[0]}"
    return f"Contrato {fila.get('id_contrato')}"


def _construir_descripcion_contrato(fila):
    observaciones = fila.get("observaciones")
    if observaciones is None:
        return ""
    return str(observaciones).strip()


def _construir_resumen_llaves(fila):
    return f"Llaves - {_construir_resumen_contrato(fila)}"


def _normalizar_fecha_hora_llave(valor):
    if valor is None:
        return None
    if isinstance(valor, datetime):
        return valor
    texto = str(valor).strip()
    if not texto:
        return None
    for formato in ("%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(texto, formato)
        except ValueError:
            continue
    raise ValueError("La fecha y hora de recogida de llave no es válida")


def _parsear_llave_recogida(valor):
    if valor in (None, "", False, 0, "0", "false", "False"):
        return 0
    if valor in (True, 1, "1", "true", "True"):
        return 1
    raise ValueError("El valor de llave recogida no es válido")


def _obtener_contratos_para_calendario():
    sql_query = text("""
        SELECT c.id_contrato,
               c.fecha_inicio,
               c.fecha_fin,
               c.numero_visitas_diarias,
               c.horario_visitas,
               c.observaciones,
               c.num_factura,
               cl.nombre AS cliente_nombre,
               cl.apellidos AS cliente_apellidos,
               cl.calle,
               cl.piso,
               cl.codigo_postal,
               cl.municipio,
               cl.pais,
               c.fecha_hora_recogida_llave,
               c.llave_recogida,
               GROUP_CONCAT(
                   CONCAT(
                       a.id_animal,
                       '::',
                       COALESCE(a.tipo_animal, ''),
                       '::',
                       COALESCE(a.nombre, '')
                   )
                   ORDER BY a.id_animal
                   SEPARATOR '||'
               ) AS animales_calendario
        FROM contratos c
        LEFT JOIN clientes cl ON cl.id_cliente = c.id_cliente
        LEFT JOIN animales a ON a.id_cliente = c.id_cliente
        WHERE c.fecha_fin >= :hoy
        GROUP BY c.id_contrato,
                 c.fecha_inicio,
                 c.fecha_fin,
                 c.numero_visitas_diarias,
                 c.horario_visitas,
                 c.observaciones,
                 c.num_factura,
                 cl.nombre,
                 cl.apellidos,
                 cl.calle,
                 cl.piso,
                 cl.codigo_postal,
                 cl.municipio,
                 cl.pais,
                 c.fecha_hora_recogida_llave,
                 c.llave_recogida
        ORDER BY c.fecha_inicio ASC, c.id_contrato ASC
    """)
    resultados = db.session.execute(sql_query, {"hoy": date.today()}).mappings().all()
    return [dict(fila) for fila in resultados]


def _generar_ics_contratos(contratos):
    ahora_utc = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lineas = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Sitters With Love//Contratos//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Sitters With Love - Contratos",
        "X-WR-CALDESC:Contratos activos y futuros",
    ]

    for contrato in contratos:
        fecha_inicio = contrato.get("fecha_inicio")
        fecha_fin = contrato.get("fecha_fin")
        if not fecha_inicio or not fecha_fin:
            continue

        dtstart = fecha_inicio.strftime("%Y%m%d")
        dtend = (fecha_fin + timedelta(days=1)).strftime("%Y%m%d")
        uid = f"contrato-{contrato['id_contrato']}@sitterswithlove.local"
        resumen = _escapar_texto_ics(_construir_resumen_contrato(contrato))
        descripcion = _escapar_texto_ics(_construir_descripcion_contrato(contrato))
        direccion = _escapar_texto_ics(_construir_direccion_cliente(contrato))

        lineas.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{ahora_utc}",
            f"DTSTART;VALUE=DATE:{dtstart}",
            f"DTEND;VALUE=DATE:{dtend}",
        ])
        lineas.extend(_formatear_linea_ics("SUMMARY", resumen))
        if direccion:
            lineas.extend(_formatear_linea_ics("LOCATION", direccion))
        if descripcion:
            lineas.extend(_formatear_linea_ics("DESCRIPTION", descripcion))
        lineas.append("END:VEVENT")

        fecha_hora_llave = contrato.get("fecha_hora_recogida_llave")
        if fecha_hora_llave:
            inicio_llave = _formatear_fecha_hora_ics(fecha_hora_llave)
            fin_llave = _formatear_fecha_hora_ics(fecha_hora_llave + timedelta(hours=1))
            resumen_llave = _escapar_texto_ics(_construir_resumen_llaves(contrato))

            lineas.extend([
                "BEGIN:VEVENT",
                f"UID:llaves-contrato-{contrato['id_contrato']}@sitterswithlove.local",
                f"DTSTAMP:{ahora_utc}",
                f"DTSTART:{inicio_llave}",
                f"DTEND:{fin_llave}",
            ])
            lineas.extend(_formatear_linea_ics("SUMMARY", resumen_llave))
            if direccion:
                lineas.extend(_formatear_linea_ics("LOCATION", direccion))
            lineas.append("END:VEVENT")

    lineas.append("END:VCALENDAR")
    return "\r\n".join(lineas) + "\r\n"


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


def parsear_factura_enviada(valor):
    if valor in (None, "", False, 0, "0", "false", "False"):
        return None
    if valor in (True, 1, "1", "true", "True"):
        return 1
    raise ValueError("El valor de factura enviada no es válido")


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
@requerir_autenticacion
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
        'num_total_visitas': contrato.num_total_visitas,
        'factura_enviada': contrato.factura_enviada,
        'fecha_hora_recogida_llave': contrato.fecha_hora_recogida_llave.strftime("%Y-%m-%dT%H:%M") if contrato.fecha_hora_recogida_llave else None,
        'llave_recogida': int(contrato.llave_recogida or 0)
    } for contrato in contratos])

# Crear un nuevo contrato
@contratos_bp.route('/contratos', methods=['POST'])
@requerir_autenticacion
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
        factura_enviada = parsear_factura_enviada(datos.get('factura_enviada'))
        fecha_hora_recogida_llave = _normalizar_fecha_hora_llave(datos.get('fecha_hora_recogida_llave'))
        llave_recogida = _parsear_llave_recogida(datos.get('llave_recogida'))
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
        observaciones=datos.get('observaciones'),
        factura_enviada=factura_enviada,
        fecha_hora_recogida_llave=fecha_hora_recogida_llave,
        llave_recogida=llave_recogida
    )
    try:
        db.session.add(nuevo_contrato)
        db.session.flush()

        nuevo_contrato.num_factura = f"{nuevo_contrato.id_contrato}-{nuevo_contrato.id_cliente}"

        nueva_tarifa_contrato = TarifasContrato(
            id_contrato=nuevo_contrato.id_contrato,
            id_tarifa=id_tarifa
        )
        db.session.add(nueva_tarifa_contrato)
        db.session.commit()
    except (DataError, IntegrityError) as error:
        db.session.rollback()
        return jsonify({'mensaje': mensaje_error_persistencia(error)}), 400

    return jsonify({
        'mensaje': 'Contrato creado exitosamente',
        'id_contrato': nuevo_contrato.id_contrato,
        'num_factura': nuevo_contrato.num_factura
    }), 201

# Obtener un contrato por ID
@contratos_bp.route('/contratos/<int:id_contrato>', methods=['GET'])
@requerir_autenticacion
def obtener_contrato(id_contrato):
    contrato = Contratos.obtener_contrato(id_contrato)
    if contrato is None:
        return jsonify({'mensaje': 'Contrato no encontrado'}), 404
    return jsonify(contrato)

@contratos_bp.route('/dashboard/contratos_activos', methods=['GET'])
@requerir_autenticacion
def obtener_contratos_activos():
    contratos = Contratos.obtener_contratos_activos()

    # Convertir a formato JSON-serializable
    contratos_json = {}
    for dia, lista_contratos in contratos.items():
        contratos_json[dia] = []
        for c in lista_contratos:
            id_cliente = c.get('id_cliente')
            visitas = c.get('visitas')
            contratos_json[dia].append({
                'id_contrato': int(c['id_contrato']) if c.get('id_contrato') is not None else None,
                'id_cliente': int(id_cliente) if id_cliente is not None else None,
                'fecha_inicio': str(c['fecha_inicio']),
                'fecha_fin': str(c['fecha_fin']),
                'visitas': int(visitas) if visitas is not None else 0,
                'horario': c['horario'],
                'tarifa': c['tarifa'],
                'nombre_animales': c['nombre_animales'],
                'total': c['total'],
                'pagado': c['pagado'],
                'num_factura': c['num_factura'],
                'num_total_visitas': c['num_total_visitas'],
                'factura_enviada': c.get('factura_enviada')
            })

    return jsonify(contratos_json)

@contratos_bp.route('/dashboard/contratos_programados', methods=['GET'])
@requerir_autenticacion
def obtener_contratos_programados():
    contratos = Contratos.obtener_contratos_programados()
    return jsonify(contratos)


@contratos_bp.route('/dashboard/contratos_impagados', methods=['GET'])
@requerir_autenticacion
def obtener_contratos_impagados():
    contratos = Contratos.obtener_contratos_impagados()
    return jsonify(contratos)


@contratos_bp.route('/calendario/contratos.ics', methods=['GET'])
def obtener_feed_calendario_contratos():
    token_configurado = _obtener_token_feed_calendario()
    if token_configurado is None:
        return jsonify({
            "mensaje": f"El feed de calendario no está configurado. Falta la variable {CALENDAR_FEED_TOKEN_ENV}."
        }), 503

    token_recibido = (request.args.get("token") or "").strip()
    if not token_recibido or not hmac.compare_digest(token_recibido, token_configurado):
        return jsonify({"mensaje": "Token de calendario no válido"}), 401

    contenido = _generar_ics_contratos(_obtener_contratos_para_calendario())
    return Response(
        contenido,
        mimetype="text/calendar",
        headers={
            "Content-Disposition": 'inline; filename="swl-contratos.ics"',
            "Cache-Control": "private, max-age=300",
        },
    )

# Actualizar un contrato
@contratos_bp.route('/contratos/<int:id_contrato>', methods=['PUT'])
@requerir_autenticacion
def actualizar_contrato(id_contrato):
    contrato = Contratos.query.get_or_404(id_contrato)
    datos = request.json
    contrato.fecha_inicio = datos.get('fecha_inicio', contrato.fecha_inicio)
    contrato.fecha_fin = datos.get('fecha_fin', contrato.fecha_fin)
    contrato.numero_visitas_diarias = datos.get('numero_visitas_diarias', contrato.numero_visitas_diarias)
    contrato.horario_visitas = datos.get('horario_visitas', contrato.horario_visitas)
    if 'observaciones' in datos:
        contrato.observaciones = datos.get('observaciones')
    if 'fecha_hora_recogida_llave' in datos:
        try:
            contrato.fecha_hora_recogida_llave = _normalizar_fecha_hora_llave(datos.get('fecha_hora_recogida_llave'))
        except ValueError as error:
            return jsonify({'mensaje': str(error)}), 400
    if 'llave_recogida' in datos:
        try:
            contrato.llave_recogida = _parsear_llave_recogida(datos.get('llave_recogida'))
        except ValueError as error:
            return jsonify({'mensaje': str(error)}), 400
    id_tarifa_para_total = None
    if 'id_tarifa' in datos:
        try:
            id_tarifa_para_total = int(datos.get('id_tarifa'))
        except (TypeError, ValueError):
            return jsonify({'mensaje': 'La tarifa seleccionada no es válida'}), 400
        if not Tarifas.query.get(id_tarifa_para_total):
            return jsonify({'mensaje': 'La tarifa seleccionada no existe'}), 400

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
        if 'factura_enviada' in datos:
            contrato.factura_enviada = parsear_factura_enviada(datos.get('factura_enviada'))
    except ValueError as error:
        return jsonify({'mensaje': str(error)}), 400

    try:
        db.session.commit()
    except (DataError, IntegrityError) as error:
        db.session.rollback()
        return jsonify({'mensaje': mensaje_error_persistencia(error)}), 400

    return jsonify({'mensaje': 'Contrato actualizado exitosamente'})

# Eliminar un contrato
@contratos_bp.route('/contratos/<int:id_contrato>', methods=['DELETE'])
@requerir_autenticacion
def eliminar_contrato(id_contrato):
    contrato = Contratos.query.get_or_404(id_contrato)
    db.session.delete(contrato)
    db.session.commit()
    return jsonify({'mensaje': 'Contrato eliminado exitosamente'})
