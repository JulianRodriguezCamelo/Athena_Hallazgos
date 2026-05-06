"""Tests de autenticación: login, /me, logout con invalidación de token."""


def test_login_exitoso(client):
    resp = client.post("/api/auth/login", json={
        "email": "admin@fiduprevisora.com",
        "password": "Admin2025*",
    })
    assert resp.status_code == 200
    data = resp.get_json()
    assert "access_token" in data
    assert data["user"]["rol"] == "administrador"


def test_login_credenciales_invalidas(client):
    resp = client.post("/api/auth/login", json={
        "email": "admin@fiduprevisora.com",
        "password": "wrong",
    })
    assert resp.status_code == 401


def test_login_sin_body(client):
    resp = client.post("/api/auth/login", json={})
    assert resp.status_code == 400


def test_me_requiere_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_con_token(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.get_json()["user"]["email"] == "admin@fiduprevisora.com"


def test_logout_invalida_token(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Logout
    resp = client.post("/api/auth/logout", headers=headers)
    assert resp.status_code == 200

    # El token ya no debe ser válido
    resp2 = client.get("/api/auth/me", headers=headers)
    assert resp2.status_code == 401


def test_logout_requiere_token(client):
    resp = client.post("/api/auth/logout")
    assert resp.status_code == 401
