from types import SimpleNamespace

from flask import Flask

from routes import clientes_routes, contratos_routes


def _app():
    app = Flask(__name__)
    app.config["TESTING"] = True
    return app


def test_crear_cliente_normaliza_telefono(monkeypatch):
    app = _app()
    capturado = {}

    class DummyClientes:
        def __init__(self, **kwargs):
            capturado.update(kwargs)

    class DummySession:
        def add(self, _):
            return None

        def commit(self):
            return None

    monkeypatch.setattr(clientes_routes, "Clientes", DummyClientes)
    monkeypatch.setattr(clientes_routes.db, "session", DummySession())

    payload = {
        "nombre": "QA",
        "apellidos": "Test",
        "calle": "Rue",
        "codigo_postal": "1234",
        "municipio": "Lux",
        "pais": "Lux",
        "telefono": "\u202a+352\xa0661\xa0280\xa0008\u202c",
        "genero": "F",
    }

    with app.test_request_context(json=payload):
        response, status = clientes_routes.crear_cliente.__wrapped__()

    assert status == 201
    assert response.get_json()["mensaje"] == "Cliente creado exitosamente"
    assert capturado["telefono"] == "+352661280008"


def test_actualizar_cliente_valida_telefono_demasiado_largo(monkeypatch):
    app = _app()

    dummy_cliente = SimpleNamespace(
        nombre="A",
        apellidos="B",
        calle="C",
        piso=None,
        codigo_postal="1234",
        municipio="M",
        pais="P",
        telefono=None,
        email=None,
        nacionalidad=None,
        idioma=None,
        genero="F",
        referencia_origen=None,
    )

    class DummyQuery:
        @staticmethod
        def get_or_404(_):
            return dummy_cliente

    class DummyClientes:
        query = DummyQuery()

    monkeypatch.setattr(clientes_routes, "Clientes", DummyClientes)

    with app.test_request_context(json={"telefono": "+" + "1" * 100}):
        response, status = clientes_routes.actualizar_cliente.__wrapped__(1)

    assert status == 400
    assert "máximo" in response.get_json()["mensaje"]


def test_actualizar_contrato_con_tarifa_inexistente_devuelve_400(monkeypatch):
    app = _app()

    dummy_contrato = SimpleNamespace(
        fecha_inicio="2026-03-01",
        fecha_fin="2026-03-02",
        numero_visitas_diarias=1,
        horario_visitas={},
        observaciones=None,
        num_total_visitas="2",
        total=0,
        pagado=0,
    )

    class DummyContratoQuery:
        @staticmethod
        def get_or_404(_):
            return dummy_contrato

    class DummyContratos:
        query = DummyContratoQuery()

    class DummyTarifaQuery:
        @staticmethod
        def get(_):
            return None

    class DummyTarifas:
        query = DummyTarifaQuery()

    monkeypatch.setattr(contratos_routes, "Contratos", DummyContratos)
    monkeypatch.setattr(contratos_routes, "Tarifas", DummyTarifas)

    with app.test_request_context(json={"id_tarifa": 999999}):
        response, status = contratos_routes.actualizar_contrato.__wrapped__(10)

    assert status == 400
    assert response.get_json()["mensaje"] == "La tarifa seleccionada no existe"
