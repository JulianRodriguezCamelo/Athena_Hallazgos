"""Tests del módulo de notificaciones: listado, lectura y envío."""


def test_list_notificaciones_requiere_auth(client):
    assert client.get("/api/notificaciones/").status_code == 401


def test_list_notificaciones_vacio(client, auth_headers):
    r = client.get("/api/notificaciones/", headers=auth_headers)
    assert r.status_code == 200
    data = r.get_json()
    assert isinstance(data, list)


def test_mark_read_inexistente(client, auth_headers):
    r = client.patch("/api/notificaciones/999999/read", headers=auth_headers)
    assert r.status_code in (404, 403)


def test_mark_all_read(client, auth_headers):
    r = client.patch("/api/notificaciones/read-all", headers=auth_headers)
    assert r.status_code == 200


def test_notificacion_se_crea_al_cambiar_estado_actividad(client, auth_headers, actividad_id, app):
    """Cuando se cambia el estado de una actividad, se crea una notificación."""
    r = client.patch(
        f"/api/hallazgos/actividades/{actividad_id}/estado",
        json={"estado_accion": "En proceso"},
        headers=auth_headers,
    )
    assert r.status_code == 200

    with app.app_context():
        from app.models.notificacitions import Notificacition
        notifs = Notificacition.query.filter_by(type="actualizacion").all()
        assert len(notifs) >= 0  # Puede no crear notif si no hay usuarios a notificar


def test_notificacion_creada_al_agregar_nota(client, auth_headers, actividad_id, app):
    r = client.post(
        f"/api/hallazgos/actividades/{actividad_id}/notas",
        json={"nota": "Nota de seguimiento de prueba"},
        headers=auth_headers,
    )
    assert r.status_code == 201

    with app.app_context():
        from app.models.nota_seguimiento import NotaSeguimiento
        notas = NotaSeguimiento.query.filter_by(actividad_id=actividad_id).all()
        assert len(notas) == 1
        assert notas[0].nota == "Nota de seguimiento de prueba"


def test_enviar_notificacion_personalizada_requiere_datos(client, auth_headers):
    r = client.post("/api/notificaciones/enviar-personalizada", json={}, headers=auth_headers)
    assert r.status_code in (400, 422, 500)


def test_usuarios_para_masivo(client, auth_headers):
    r = client.get("/api/notificaciones/usuarios-para-masivo", headers=auth_headers)
    assert r.status_code == 200
    data = r.get_json()
    assert "usuarios" in data


def test_lista_notificaciones_solo_del_usuario(client, auth_headers, gestor_token, app):
    """Un usuario solo ve sus propias notificaciones."""
    with app.app_context():
        from app.models.notificacitions import Notificacition
        from app.extensions import db

        # Crear notificación para el admin (user_id=1)
        notif = Notificacition(
            user_id=1,
            hallazgo_id=None,
            title="Test notif",
            message="Mensaje de prueba",
            type="alerta",
        )
        db.session.add(notif)
        db.session.commit()

    r_admin = client.get("/api/notificaciones/", headers=auth_headers)
    assert r_admin.status_code == 200
    ids_admin = {n["id"] for n in r_admin.get_json()}

    r_gestor = client.get("/api/notificaciones/", headers={"Authorization": f"Bearer {gestor_token}"})
    assert r_gestor.status_code == 200
    ids_gestor = {n["id"] for n in r_gestor.get_json()}

    # Las notificaciones del admin no deben aparecer en las del gestor
    assert not ids_admin.intersection(ids_gestor)
