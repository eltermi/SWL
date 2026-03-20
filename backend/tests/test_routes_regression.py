from types import SimpleNamespace

from flask import Flask

from routes import animales_routes, clientes_routes, contactos_routes, contratos_routes


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
            self.id_cliente = 1

    class DummySession:
        def add(self, _):
            return None

        def flush(self):
            return None

        def commit(self):
            return None

    monkeypatch.setattr(clientes_routes, "Clientes", DummyClientes)
    monkeypatch.setattr(clientes_routes.db, "session", DummySession())

    payload = {
        "nombre": "QA",
        "apellidos": "Test",
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


def test_crear_cliente_permite_apellidos_nulos(monkeypatch):
    app = _app()
    capturado = {}

    class DummyClientes:
        def __init__(self, **kwargs):
            capturado.update(kwargs)
            self.id_cliente = 2

    class DummySession:
        def add(self, _):
            return None

        def flush(self):
            return None

        def commit(self):
            return None

    monkeypatch.setattr(clientes_routes, "Clientes", DummyClientes)
    monkeypatch.setattr(clientes_routes.db, "session", DummySession())

    payload = {
        "nombre": "QA",
        "telefono": "+352661280008",
    }

    with app.test_request_context(json=payload):
        response, status = clientes_routes.crear_cliente.__wrapped__()

    assert status == 201
    assert response.get_json()["mensaje"] == "Cliente creado exitosamente"
    assert capturado["apellidos"] is None
    assert capturado["pais"] == "Luxembourg"
    assert capturado["genero"] is None


def test_crear_cliente_rechaza_genero_invalido(monkeypatch):
    app = _app()

    payload = {
        "nombre": "QA",
        "genero": "X",
    }

    with app.test_request_context(json=payload):
        response, status = clientes_routes.crear_cliente.__wrapped__()

    assert status == 400
    assert "genero" in response.get_json()["mensaje"]


def test_crear_animal_rechaza_sexo_invalido(monkeypatch):
    app = _app()

    payload = {
        "nombre": "Misu",
        "id_cliente": "1",
        "tipo_animal": "Gato",
        "sexo": "X",
    }

    with app.test_request_context(data=payload):
        response, status = animales_routes.crear_animal.__wrapped__()

    assert status == 400
    assert "sexo" in response.get_json()["mensaje"]


def test_actualizar_animal_permite_borrar_sexo(monkeypatch):
    app = _app()

    dummy_animal = SimpleNamespace(
        tipo_animal="Gato",
        nombre="Misu",
        sexo="F",
        edad=2020,
        medicacion=None,
        foto=None,
    )

    class DummyQuery:
        @staticmethod
        def get_or_404(_):
            return dummy_animal

    class DummyAnimales:
        query = DummyQuery()

    class DummySession:
        def commit(self):
            return None

    monkeypatch.setattr(animales_routes, "Animales", DummyAnimales)
    monkeypatch.setattr(animales_routes.db, "session", DummySession())

    with app.test_request_context(json={"sexo": ""}):
        response = animales_routes.actualizar_animal.__wrapped__(1)

    assert response.get_json()["mensaje"] == "Animal actualizado exitosamente"
    assert dummy_animal.sexo is None


def test_crear_animal_marca_fallecido_desde_formulario(monkeypatch):
    app = _app()
    capturado = {}

    class DummyAnimales:
        def __init__(self, **kwargs):
            capturado.update(kwargs)

    class DummySession:
        def add(self, _):
            return None

        def commit(self):
            return None

    monkeypatch.setattr(animales_routes, "Animales", DummyAnimales)
    monkeypatch.setattr(animales_routes.db, "session", DummySession())

    payload = {
        "nombre": "Misu",
        "id_cliente": "1",
        "tipo_animal": "Gato",
        "fallecido": "true",
    }

    with app.test_request_context(data=payload):
        response, status = animales_routes.crear_animal.__wrapped__()

    assert status == 201
    assert capturado["fallecido"] is True


def test_actualizar_animal_permite_marcar_fallecido(monkeypatch):
    app = _app()

    dummy_animal = SimpleNamespace(
        tipo_animal="Gato",
        nombre="Misu",
        sexo="F",
        edad=2020,
        medicacion=None,
        foto=None,
        fallecido=False,
    )

    class DummyQuery:
        @staticmethod
        def get_or_404(_):
            return dummy_animal

    class DummyAnimales:
        query = DummyQuery()

    class DummySession:
        def commit(self):
            return None

    monkeypatch.setattr(animales_routes, "Animales", DummyAnimales)
    monkeypatch.setattr(animales_routes.db, "session", DummySession())

    with app.test_request_context(json={"fallecido": True}):
        response = animales_routes.actualizar_animal.__wrapped__(1)

    assert response.get_json()["mensaje"] == "Animal actualizado exitosamente"
    assert dummy_animal.fallecido is True


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


def test_crear_contrato_guarda_factura_enviada(monkeypatch):
    app = _app()
    capturado = {}

    class DummyContrato:
        def __init__(self, **kwargs):
            capturado.update(kwargs)
            self.id_contrato = 11
            self.id_cliente = kwargs["id_cliente"]
            self.num_factura = None

    class DummyTarifa:
        precio_base = 10

    class DummyTarifasQuery:
        @staticmethod
        def get(_):
            return DummyTarifa()

    class DummyTarifas:
        query = DummyTarifasQuery()

    class DummyTarifaContrato:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    class DummySession:
        def add(self, _):
            return None

        def flush(self):
            return None

        def commit(self):
            return None

    monkeypatch.setattr(contratos_routes, "Contratos", DummyContrato)
    monkeypatch.setattr(contratos_routes, "Tarifas", DummyTarifas)
    monkeypatch.setattr(contratos_routes, "TarifasContrato", DummyTarifaContrato)
    monkeypatch.setattr(contratos_routes.db, "session", DummySession())

    payload = {
        "id_cliente": 3,
        "fecha_inicio": "2026-03-01",
        "fecha_fin": "2026-03-02",
        "numero_visitas_diarias": 1,
        "num_total_visitas": "2",
        "pagado": "0",
        "id_tarifa": 7,
        "factura_enviada": 1,
    }

    with app.test_request_context(json=payload):
        response, status = contratos_routes.crear_contrato.__wrapped__()

    assert status == 201
    assert capturado["factura_enviada"] == 1


def test_actualizar_contrato_permite_marcar_factura_enviada(monkeypatch):
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
        factura_enviada=None,
    )

    class DummyContratoQuery:
        @staticmethod
        def get_or_404(_):
            return dummy_contrato

    class DummyContratos:
        query = DummyContratoQuery()

    class DummyTarifa:
        precio_base = 10

    class DummyTarifasQuery:
        @staticmethod
        def get(_):
            return DummyTarifa()

    class DummyTarifas:
        query = DummyTarifasQuery()

    class DummyTarifaContratoQuery:
        @staticmethod
        def filter_by(**_kwargs):
            return SimpleNamespace(first=lambda: SimpleNamespace(id_tarifa=5))

    class DummyTarifasContrato:
        query = DummyTarifaContratoQuery()

    class DummySession:
        def commit(self):
            return None

    monkeypatch.setattr(contratos_routes, "Contratos", DummyContratos)
    monkeypatch.setattr(contratos_routes, "Tarifas", DummyTarifas)
    monkeypatch.setattr(contratos_routes, "TarifasContrato", DummyTarifasContrato)
    monkeypatch.setattr(contratos_routes.db, "session", DummySession())

    with app.test_request_context(json={"factura_enviada": 1}):
        response = contratos_routes.actualizar_contrato.__wrapped__(10)

    assert response.get_json()["mensaje"] == "Contrato actualizado exitosamente"
    assert dummy_contrato.factura_enviada == 1


def test_crear_contacto_normaliza_telefono(monkeypatch):
    app = _app()
    capturado = {}

    class DummyContacto:
        def __init__(self, **kwargs):
            capturado.update(kwargs)
            self.id_contacto = 7

    class DummySession:
        def add(self, _):
            return None

        def commit(self):
            return None

    class DummyClienteQuery:
        @staticmethod
        def get(_):
            return object()

    class DummyClientes:
        query = DummyClienteQuery()

    monkeypatch.setattr(contactos_routes, "ContactosAdicionales", DummyContacto)
    monkeypatch.setattr(contactos_routes, "Clientes", DummyClientes)
    monkeypatch.setattr(contactos_routes.db, "session", DummySession())

    payload = {
        "nombre": "Ana",
        "id_cliente": 3,
        "telefono": "\u202a+352\xa0661\xa0280\xa0008\u202c"
    }

    with app.test_request_context(json=payload):
        response, status = contactos_routes.crear_contacto.__wrapped__()

    assert status == 201
    assert response.get_json()["mensaje"] == "Contacto creado exitosamente"
    assert capturado["telefono"] == "+352661280008"


def test_actualizar_contacto_valida_cliente_inexistente(monkeypatch):
    app = _app()

    dummy_contacto = SimpleNamespace(
        id_cliente=1,
        nombre="Ana",
        apellidos="Test",
        telefono=None,
        email=None,
    )

    class DummyContactoQuery:
        @staticmethod
        def get_or_404(_):
            return dummy_contacto

    class DummyContactos:
        query = DummyContactoQuery()

    class DummyClienteQuery:
        @staticmethod
        def get(_):
            return None

    class DummyClientes:
        query = DummyClienteQuery()

    monkeypatch.setattr(contactos_routes, "ContactosAdicionales", DummyContactos)
    monkeypatch.setattr(contactos_routes, "Clientes", DummyClientes)

    with app.test_request_context(json={"id_cliente": 999}):
        response, status = contactos_routes.actualizar_contacto.__wrapped__(5)

    assert status == 400
    assert response.get_json()["mensaje"] == "El cliente seleccionado no existe."
