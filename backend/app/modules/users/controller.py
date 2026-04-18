from app.modules.users import service

VALID_ROLES = {"vicepresidente", "directivo", "tecnico", "gestor"}


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
