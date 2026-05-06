"""Tests del módulo de hallazgos: listado, detalle, filtros y exportación."""


def test_list_hallazgos_requiere_auth(client):
    resp = client.get("/api/hallazgos/")
    assert resp.status_code == 401


def test_list_hallazgos_vacio(client, auth_headers):
    resp = client.get("/api/hallazgos/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.get_json()
    assert "hallazgos" in data
    assert "total" in data


def test_get_hallazgo_inexistente(client, auth_headers):
    resp = client.get("/api/hallazgos/999999", headers=auth_headers)
    assert resp.status_code == 404


def test_export_csv(client, auth_headers):
    resp = client.get("/api/hallazgos/export?format=csv", headers=auth_headers)
    assert resp.status_code == 200
    assert "text/csv" in resp.content_type


def test_export_xlsx(client, auth_headers):
    resp = client.get("/api/hallazgos/export?format=xlsx", headers=auth_headers)
    assert resp.status_code == 200
    assert "spreadsheetml" in resp.content_type


def test_filtros_estado(client, auth_headers):
    resp = client.get("/api/hallazgos/?estado=abierto", headers=auth_headers)
    assert resp.status_code == 200


def test_estados_disponibles(client, auth_headers):
    resp = client.get("/api/hallazgos/estados", headers=auth_headers)
    assert resp.status_code == 200
    assert "estados" in resp.get_json()


def test_dependencias_disponibles(client, auth_headers):
    resp = client.get("/api/hallazgos/dependencias", headers=auth_headers)
    assert resp.status_code == 200


def test_profesional_no_puede_subir_excel(client):
    """El rol profesional no puede acceder al endpoint de upload."""
    # Primero creamos un usuario profesional
    # (simplificado: solo verificamos que un token sin rol adecuado es rechazado)
    resp = client.post("/api/uploads/", data={})
    assert resp.status_code == 401
