"""Tests del módulo de auditoría: registro y consulta de audit_log."""


def test_audit_logs_requiere_auth(client):
    assert client.get("/api/audit-logs/").status_code == 401


def test_audit_logs_lista_vacia(client, auth_headers):
    r = client.get("/api/audit-logs/", headers=auth_headers)
    assert r.status_code == 200
    data = r.get_json()
    assert "logs" in data
    assert "total" in data
    assert "pages" in data
    assert isinstance(data["logs"], list)


def test_audit_log_paginacion(client, auth_headers):
    r = client.get("/api/audit-logs/?page=1&per_page=10", headers=auth_headers)
    assert r.status_code == 200
    data = r.get_json()
    assert data["per_page"] == 10
    assert data["page"] == 1


def test_audit_log_filtro_entity_type(client, auth_headers):
    r = client.get("/api/audit-logs/?entity_type=hallazgo", headers=auth_headers)
    assert r.status_code == 200
    data = r.get_json()
    for log in data["logs"]:
        assert log["entity_type"] == "hallazgo"


def test_audit_log_filtro_accion(client, auth_headers):
    r = client.get("/api/audit-logs/?action=update", headers=auth_headers)
    assert r.status_code == 200


def test_audit_log_filtro_fechas(client, auth_headers):
    r = client.get("/api/audit-logs/?desde=2024-01-01&hasta=2030-12-31", headers=auth_headers)
    assert r.status_code == 200


def test_audit_log_fecha_invalida_ignorada(client, auth_headers):
    r = client.get("/api/audit-logs/?desde=no-es-fecha", headers=auth_headers)
    assert r.status_code == 200


def test_audit_actions_endpoint(client, auth_headers):
    r = client.get("/api/audit-logs/actions", headers=auth_headers)
    assert r.status_code == 200
    assert "actions" in r.get_json()


def test_audit_log_se_registra_al_actualizar_hallazgo(client, auth_headers, hallazgo_id, app):
    """Actualizar un hallazgo debe crear una entrada en audit_log."""
    r = client.put(
        f"/api/hallazgos/{hallazgo_id}",
        json={"observaciones": "Cambio auditado en test"},
        headers=auth_headers,
    )
    assert r.status_code == 200

    with app.app_context():
        from app.models.audit_log import AuditLog
        logs = AuditLog.query.filter_by(
            entity_type="hallazgo",
            entity_id=hallazgo_id,
            action="update_hallazgo",
        ).all()
        assert len(logs) >= 1
        assert logs[0].user_id is not None


def test_audit_log_enriquece_nombre_usuario(client, auth_headers, hallazgo_id):
    """La API debe incluir user_nombre en cada log."""
    # Generar al menos un log
    client.put(
        f"/api/hallazgos/{hallazgo_id}",
        json={"observaciones": "Para audit nombre"},
        headers=auth_headers,
    )
    r = client.get("/api/audit-logs/", headers=auth_headers)
    assert r.status_code == 200
    logs = r.get_json()["logs"]
    if logs:
        assert "user_nombre" in logs[0]
        assert logs[0]["user_nombre"]  # No vacío


def test_audit_per_page_max_200(client, auth_headers):
    """per_page no debe exceder 200 aunque se pida más."""
    r = client.get("/api/audit-logs/?per_page=9999", headers=auth_headers)
    assert r.status_code == 200
    assert r.get_json()["per_page"] <= 200
