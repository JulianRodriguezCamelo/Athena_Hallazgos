from app.modules.users import service

VALID_ROLES = {"vicepresidente", "directivo", "profesional", "gestor"}


def list_users(current_user):
    users = service.list_users(current_user)
    return [u.to_dict() for u in users]


def get_user(user_id: int, current_user):
    user = service.get_by_id(user_id)
    if current_user.rol == "directivo" and user.dependencia != current_user.dependencia:
        return None, "No tiene permisos para ver este usuario"
    return user.to_dict(), None


def create_user(data: dict):
    required = ["nombre", "email", "password", "rol"]
    for field in required:
        if not data.get(field):
            return None, f"El campo '{field}' es requerido"
    if data["rol"] not in VALID_ROLES:
        return None, "Rol inválido"
    if service.get_by_email(data["email"]):
        return None, "El email ya está registrado"
    user = service.create(data)
    try:
        from app.modules.notifcations.service import NotificationService
        NotificationService.notificar_usuario_registrado(user, password_temporal=data["password"])
    except Exception:
        pass
    return user.to_dict(), None


def update_user(user_id: int, data: dict):
    user = service.get_by_id(user_id)
    if "email" in data:
        existing = service.get_by_email(data["email"])
        if existing and existing.id != user_id:
            return None, "El email ya está en uso"
    if "rol" in data and data["rol"] not in VALID_ROLES:
        return None, "Rol inválido"
    updated = service.update(user, data)
    return updated.to_dict(), None


def delete_user(user_id: int, current_user_id: int):
    if current_user_id == user_id:
        return False, "No puede eliminar su propio usuario"
    user = service.get_by_id(user_id)
    service.deactivate(user)
    return True, None


def distinct_dependencias_user(current_user):
    return [d[0] for d in service.distinct_dependencias()]


def reset_non_admin_users() -> dict:
    """Hard-delete all non-admin users handling all FK constraints."""
    from app.models.user import User
    from app.models.upload_history import UploadHistory
    from app.models.notificacitions import Notificacition
    from app.extensions import db

    # IDs de usuarios que serán eliminados
    non_admin_ids = [
        u.id for u in User.query.filter(User.rol != "administrador").with_entities(User.id).all()
    ]
    if not non_admin_ids:
        return {"eliminados": 0}

    # 1. Eliminar notificaciones de esos usuarios (sin ON DELETE definido)
    Notificacition.query.filter(
        Notificacition.user_id.in_(non_admin_ids)
    ).delete(synchronize_session=False)

    # 2. Reasignar uploads al admin (uploaded_by_id NOT NULL)
    admin = service.get_by_email("admin@fiduprevisora.com")
    if admin:
        UploadHistory.query.filter(
            UploadHistory.uploaded_by_id.in_(non_admin_ids)
        ).update({"uploaded_by_id": admin.id}, synchronize_session=False)

    # 3. Nullear responsable_user_id en hallazgos (por si la migración ya corrió)
    try:
        from app.models.hallazgo import Hallazgo
        Hallazgo.query.filter(
            Hallazgo.responsable_user_id.in_(non_admin_ids)
        ).update({"responsable_user_id": None}, synchronize_session=False)
    except Exception:
        pass

    # 4. Borrar usuarios (checklist SET NULL, nota_seguimiento SET NULL, user_preferences CASCADE)
    deleted = User.query.filter(User.id.in_(non_admin_ids)).delete(synchronize_session=False)
    db.session.commit()
    return {"eliminados": deleted}


def bulk_upload_users(file) -> dict:
    import os, tempfile
    filename = file.filename or ""
    if not filename.lower().endswith((".xlsx", ".xls")):
        return {"error": "Solo se permiten archivos .xlsx o .xls"}

    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        parsed, parse_errors = service.parse_users_excel(tmp_path)
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

    if not parsed and parse_errors:
        return {"error": parse_errors[0], "errores": parse_errors}

    created_users, skipped = service.bulk_create(parsed)

    # Send welcome notification to newly created users
    for u in created_users:
        try:
            from app.modules.notifcations.service import NotificationService
            pw = next((p["password"] for p in parsed if p["email"] == u.email), None)
            if pw:
                NotificationService.notificar_usuario_registrado(u, password_temporal=pw)
        except Exception:
            pass

    return {
        "creados": len(created_users),
        "omitidos": len(skipped),
        "total_leidos": len(parsed),
        "errores_parseo": parse_errors,
        "omitidos_detalle": skipped,
        "usuarios_creados": [u.to_dict() for u in created_users],
    }
