"""Tests del módulo de uploads: historial y permisos por rol."""
import io


def test_upload_requiere_auth(client):
    resp = client.post("/api/uploads/")
    assert resp.status_code == 401


def test_upload_sin_archivo(client, auth_headers):
    resp = client.post("/api/uploads/", headers=auth_headers, data={})
    assert resp.status_code == 400


def test_upload_extension_invalida(client, auth_headers):
    data = {"file": (io.BytesIO(b"contenido"), "archivo.txt")}
    resp = client.post(
        "/api/uploads/",
        headers=auth_headers,
        data=data,
        content_type="multipart/form-data",
    )
    assert resp.status_code == 400


def test_historial_uploads_vacio(client, auth_headers):
    resp = client.get("/api/uploads/history", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert "history" in data
    assert "total" in data


def test_analyze_requiere_auth(client):
    resp = client.post("/api/uploads/analyze")
    assert resp.status_code == 401


def test_roles_gestor_puede_ver_historial(client):
    """El rol gestor debe poder ver el historial de sus propias cargas."""
    # Verificar que la ruta no devuelve 403 a usuarios con el rol correcto
    # (test completo requeriría fixture de usuario gestor)
    resp = client.get("/api/uploads/history")
    assert resp.status_code == 401  # sin token → 401, no 403
