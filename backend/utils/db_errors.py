import re

from sqlalchemy.exc import DataError, IntegrityError


def mensaje_error_persistencia(error):
    if isinstance(error, DataError):
        mensaje_original = str(getattr(error, "orig", error))
        columna = _extraer_columna_data_too_long(mensaje_original)
        if columna:
            return f"El valor del campo '{columna}' es demasiado largo."
        return "Hay datos con un formato o longitud no válidos."

    if isinstance(error, IntegrityError):
        return "No se puede guardar el registro por una restricción de datos."

    return "No se pudo guardar la información en la base de datos."


def _extraer_columna_data_too_long(mensaje):
    coincidencia = re.search(r"column '([^']+)'", mensaje, flags=re.IGNORECASE)
    if coincidencia:
        return coincidencia.group(1)
    return None
