import re
import unicodedata


MAX_PHONE_LENGTH = 32


def _limpiar_texto_base(valor):
    if valor is None:
        return None

    texto = unicodedata.normalize("NFKC", str(valor))
    texto = "".join(
        caracter
        for caracter in texto
        if unicodedata.category(caracter) not in {"Cf", "Cc"}
    )
    texto = texto.replace("\u00a0", " ")
    texto = re.sub(r"\s+", " ", texto).strip()
    return texto or None


def normalizar_telefono(valor):
    texto = _limpiar_texto_base(valor)
    if not texto:
        return None

    tiene_prefijo_internacional = texto.startswith("+")
    digitos = re.sub(r"\D", "", texto)

    if not digitos:
        raise ValueError("El teléfono no es válido.")

    telefono = f"+{digitos}" if tiene_prefijo_internacional else digitos

    if len(telefono) > MAX_PHONE_LENGTH:
        raise ValueError(
            f"El teléfono supera el máximo de {MAX_PHONE_LENGTH} caracteres permitidos."
        )

    return telefono
