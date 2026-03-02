from sqlalchemy.exc import DataError, IntegrityError

from utils.db_errors import mensaje_error_persistencia


def test_mensaje_data_error_columna():
    error = DataError(
        statement="INSERT",
        params={},
        orig=Exception("Data too long for column 'telefono' at row 1"),
    )
    mensaje = mensaje_error_persistencia(error)
    assert "telefono" in mensaje


def test_mensaje_integrity_error():
    error = IntegrityError(statement="INSERT", params={}, orig=Exception("FK fail"))
    assert "restricción" in mensaje_error_persistencia(error)
