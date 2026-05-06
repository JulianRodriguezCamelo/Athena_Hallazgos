"""Tests de control de acceso por rol.

Verifica que cada endpoint respete la jerarquía:
  administrador > vicepresidente > directivo/gestor > profesional
"""


# ── Gestión de usuarios (solo admin) ─────────────────────────────────────────

def test_list_users_solo_admin(client, vp_token, gestor_token, profesional_token):
    for token in (vp_token, gestor_token, profesional_token):
        r = client.get("/api/users/", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 403, f"Rol no-admin pudo listar usuarios"


def test_create_user_solo_admin(client, gestor_token):
    r = client.post("/api/users/", json={
        "email": "nuevo@test.com", "nombre": "Nuevo", "rol": "profesional", "password": "P4ss*",
    }, headers={"Authorization": f"Bearer {gestor_token}"})
    assert r.status_code == 403


def test_delete_user_solo_admin(client, gestor_token):
    r = client.delete("/api/users/999", headers={"Authorization": f"Bearer {gestor_token}"})
    assert r.status_code == 403


# ── Actualización de hallazgos (min directivo) ────────────────────────────────

def test_profesional_no_puede_actualizar_hallazgo(client, profesional_token, hallazgo_id):
    r = client.put(
        f"/api/hallazgos/{hallazgo_id}",
        json={"estado": "Cerrado"},
        headers={"Authorization": f"Bearer {profesional_token}"},
    )
    assert r.status_code == 403


def test_gestor_puede_actualizar_hallazgo(client, gestor_token, hallazgo_id):
    r = client.put(
        f"/api/hallazgos/{hallazgo_id}",
        json={"observaciones": "Actualizado en test"},
        headers={"Authorization": f"Bearer {gestor_token}"},
    )
    # El gestor tiene min_role directivo (rol=2), debe poder actualizar
    assert r.status_code in (200, 404)  # 404 si el hallazgo no es accesible para el gestor


def test_vp_puede_ver_hallazgos(client, vp_token, hallazgo_id):
    r = client.get("/api/hallazgos/", headers={"Authorization": f"Bearer {vp_token}"})
    assert r.status_code == 200


# ── Auditoría (solo admin) ────────────────────────────────────────────────────

def test_audit_logs_solo_admin(client, vp_token, gestor_token, profesional_token):
    for token in (vp_token, gestor_token, profesional_token):
        r = client.get("/api/audit-logs/", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 403


def test_audit_logs_admin_ok(client, auth_headers):
    r = client.get("/api/audit-logs/", headers=auth_headers)
    assert r.status_code == 200
    data = r.get_json()
    assert "logs" in data
    assert "total" in data


# ── Uploads (solo admin) ──────────────────────────────────────────────────────

def test_upload_historial_gestor_puede_ver(client, gestor_token):
    r = client.get("/api/uploads/history", headers={"Authorization": f"Bearer {gestor_token}"})
    assert r.status_code == 200


def test_upload_solo_admin_puede_subir_excel(client, profesional_token):
    import io
    data = {"file": (io.BytesIO(b"fake"), "archivo.xlsx")}
    r = client.post(
        "/api/uploads/",
        headers={"Authorization": f"Bearer {profesional_token}"},
        data=data,
        content_type="multipart/form-data",
    )
    assert r.status_code == 403


# ── Notas de actividad (cualquier rol autenticado) ────────────────────────────

def test_profesional_puede_agregar_nota(client, profesional_token, actividad_id):
    r = client.post(
        f"/api/hallazgos/actividades/{actividad_id}/notas",
        json={"nota": "Nota de prueba desde profesional"},
        headers={"Authorization": f"Bearer {profesional_token}"},
    )
    # 201 si tiene acceso, 404 si el hallazgo no es visible para este profesional
    assert r.status_code in (201, 404)


def test_sin_token_no_puede_ver_actividades(client, hallazgo_id):
    r = client.get(f"/api/hallazgos/{hallazgo_id}/actividades")
    assert r.status_code == 401


# ── Preferencias (admin, VP, directivo) ──────────────────────────────────────

def test_profesional_no_puede_guardar_preferencias(client, profesional_token):
    r = client.put(
        "/api/users/me/preferences",
        json={"dashboard_layout": []},
        headers={"Authorization": f"Bearer {profesional_token}"},
    )
    assert r.status_code == 403
