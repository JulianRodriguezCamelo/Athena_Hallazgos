"""Fixtures compartidos para toda la suite de tests."""
import pytest
from unittest.mock import patch
from app import create_app
from app.extensions import db as _db


# ── Bloqueo global de emails ──────────────────────────────────────────────────

@pytest.fixture(autouse=True, scope="session")
def block_emails():
    """Parchea mail.send para que ningún test envíe correos reales."""
    with patch("app.extensions.mail.send"):
        yield


# ── App y BD ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def app():
    """App Flask configurada para tests (SQLite en memoria)."""
    app = create_app("testing")
    yield app


@pytest.fixture(scope="session")
def _db_setup(app):
    with app.app_context():
        _db.create_all()
        yield _db
        _db.drop_all()


@pytest.fixture()
def db(_db_setup, app):
    """BD limpia por test: rollback al finalizar."""
    with app.app_context():
        connection = _db_setup.engine.connect()
        transaction = connection.begin()
        _db_setup.session.bind = connection
        yield _db_setup
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(app):
    return app.test_client()


# ── Tokens por rol ────────────────────────────────────────────────────────────

@pytest.fixture()
def admin_token(client):
    """Token JWT del usuario admin por defecto."""
    resp = client.post("/api/auth/login", json={
        "email": "admin@fiduprevisora.com",
        "password": "Admin2025*",
    })
    assert resp.status_code == 200, f"Login admin falló: {resp.get_json()}"
    return resp.get_json()["access_token"]


@pytest.fixture()
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def _create_user_and_token(client, email, nombre, rol, password="Test2025*", **kwargs):
    """Crea un usuario via API admin y devuelve su token JWT."""
    admin_resp = client.post("/api/auth/login", json={
        "email": "admin@fiduprevisora.com", "password": "Admin2025*",
    })
    admin_headers = {"Authorization": f"Bearer {admin_resp.get_json()['access_token']}"}
    payload = {"email": email, "nombre": nombre, "rol": rol, "password": password, **kwargs}
    r = client.post("/api/users/", json=payload, headers=admin_headers)
    # 409 means user already exists from a previous test in the session-scoped DB
    if r.status_code not in (201, 409):
        assert False, f"No se pudo crear usuario {rol}: {r.get_json()}"
    token_resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert token_resp.status_code == 200
    return token_resp.get_json()["access_token"]


@pytest.fixture()
def vp_token(client):
    return _create_user_and_token(
        client, email="vp_test@test.com", nombre="VP Test",
        rol="vicepresidente", vicepresidencia="VP Riesgos",
    )


@pytest.fixture()
def gestor_token(client):
    return _create_user_and_token(
        client, email="gestor_test@test.com", nombre="Gestor Test",
        rol="gestor", vicepresidencia="VP Riesgos", dependencia="Riesgos Operativos",
    )


@pytest.fixture()
def profesional_token(client):
    return _create_user_and_token(
        client, email="prof_test@test.com", nombre="Profesional Test",
        rol="profesional", dependencia="Riesgos Operativos",
    )


# ── Datos de prueba ───────────────────────────────────────────────────────────

@pytest.fixture()
def hallazgo_id(app):
    """Crea un hallazgo directamente en BD y devuelve su ID."""
    with app.app_context():
        from app.models.hallazgo import Hallazgo
        from app.extensions import db
        from datetime import datetime, timezone, timedelta

        h = Hallazgo(
            codigo_del_hallazgo="TEST-001",
            descripcion="Hallazgo de prueba para tests",
            estado="Abierto",
            vicepresidencia="VP Riesgos",
            dependencia_reporta_ero="Riesgos Operativos",
            responsable_plan_accion="Profesional Test",
            fecha_cierre_proyectada=datetime.now(timezone.utc) + timedelta(days=10),
        )
        db.session.add(h)
        db.session.commit()
        return h.id


@pytest.fixture()
def actividad_id(app, hallazgo_id):
    """Crea una actividad para el hallazgo de prueba y devuelve su ID."""
    with app.app_context():
        from app.models.actividad import Actividad
        from app.extensions import db
        from datetime import datetime, timezone, timedelta

        a = Actividad(
            hallazgo_id=hallazgo_id,
            codigo_del_hallazgo="TEST-001",
            orden=1,
            descripcion="Actividad de prueba",
            estado_accion="Abierto",
            responsable="Profesional Test",
            fecha_compromiso=datetime.now(timezone.utc) + timedelta(days=5),
        )
        db.session.add(a)
        db.session.commit()
        return a.id
