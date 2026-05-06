"""Tests del módulo dashboard: métricas, gráficas y endpoints por rol."""


# ── Dashboard general (VP / admin) ───────────────────────────────────────────

def test_metrics_requiere_auth(client):
    assert client.get("/api/dashboard/metrics").status_code == 401


def test_metrics_admin(client, auth_headers):
    r = client.get("/api/dashboard/metrics", headers=auth_headers)
    assert r.status_code == 200
    data = r.get_json()
    assert "total_hallazgos" in data
    assert "vencidos" in data
    assert "con_prorroga" in data


def test_por_estado(client, auth_headers):
    r = client.get("/api/dashboard/por-estado", headers=auth_headers)
    assert r.status_code == 200
    assert "data" in r.get_json()


def test_por_dependencia(client, auth_headers):
    r = client.get("/api/dashboard/por-dependencia", headers=auth_headers)
    assert r.status_code == 200
    assert "data" in r.get_json()


def test_por_responsable(client, auth_headers):
    r = client.get("/api/dashboard/por-responsable", headers=auth_headers)
    assert r.status_code == 200
    assert "data" in r.get_json()


def test_timeline(client, auth_headers):
    r = client.get("/api/dashboard/timeline", headers=auth_headers)
    assert r.status_code == 200
    assert "data" in r.get_json()


def test_prorrogas(client, auth_headers):
    r = client.get("/api/dashboard/prorrogas", headers=auth_headers)
    assert r.status_code == 200
    assert "total_prorrogas" in r.get_json()


def test_uploads_recientes(client, auth_headers):
    r = client.get("/api/dashboard/uploads-recientes", headers=auth_headers)
    assert r.status_code == 200
    assert "uploads" in r.get_json()


def test_por_estado_plan(client, auth_headers):
    r = client.get("/api/dashboard/por-estado-plan", headers=auth_headers)
    assert r.status_code == 200


# ── Dashboard directivo ───────────────────────────────────────────────────────

def test_directivo_mis_metricas_requiere_auth(client):
    assert client.get("/api/dashboard/directivo/mis-metricas").status_code == 401


def test_directivo_mis_metricas_como_admin(client, auth_headers):
    r = client.get("/api/dashboard/directivo/mis-metricas", headers=auth_headers)
    assert r.status_code == 200


def test_directivo_mis_hallazgos(client, auth_headers):
    r = client.get("/api/dashboard/directivo/mis-hallazgos", headers=auth_headers)
    assert r.status_code == 200
    data = r.get_json()
    assert "hallazgos" in data
    assert "total" in data


def test_directivo_mis_actividades(client, auth_headers):
    r = client.get("/api/dashboard/directivo/mis-actividades", headers=auth_headers)
    assert r.status_code == 200
    assert "actividades" in r.get_json()


def test_directivo_por_estado_accion(client, auth_headers):
    r = client.get("/api/dashboard/directivo/por-estado-accion", headers=auth_headers)
    assert r.status_code == 200


# ── Dashboard gestor ──────────────────────────────────────────────────────────

def test_gestor_mis_metricas(client, gestor_token):
    headers = {"Authorization": f"Bearer {gestor_token}"}
    r = client.get("/api/dashboard/gestor/mis-metricas", headers=headers)
    assert r.status_code == 200


def test_gestor_por_estado(client, gestor_token):
    headers = {"Authorization": f"Bearer {gestor_token}"}
    r = client.get("/api/dashboard/gestor/por-estado", headers=headers)
    assert r.status_code == 200


def test_gestor_hallazgos_paginado(client, gestor_token):
    headers = {"Authorization": f"Bearer {gestor_token}"}
    r = client.get("/api/dashboard/gestor/hallazgos?page=1&per_page=10", headers=headers)
    assert r.status_code == 200
    data = r.get_json()
    assert "hallazgos" in data
    assert "total" in data


def test_gestor_actividades(client, gestor_token):
    headers = {"Authorization": f"Bearer {gestor_token}"}
    r = client.get("/api/dashboard/gestor/actividades", headers=headers)
    assert r.status_code == 200


def test_gestor_responsables_criticos(client, gestor_token):
    headers = {"Authorization": f"Bearer {gestor_token}"}
    r = client.get("/api/dashboard/gestor/responsables-criticos", headers=headers)
    assert r.status_code == 200


def test_gestor_bitacora(client, gestor_token):
    headers = {"Authorization": f"Bearer {gestor_token}"}
    r = client.get("/api/dashboard/gestor/bitacora", headers=headers)
    assert r.status_code == 200


def test_gestor_top_retrasados(client, gestor_token):
    headers = {"Authorization": f"Bearer {gestor_token}"}
    r = client.get("/api/dashboard/gestor/top-retrasados", headers=headers)
    assert r.status_code == 200
