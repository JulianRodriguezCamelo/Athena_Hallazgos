from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models.user import User

ROLES_HIERARCHY = {
    "administrador": 4,
    "vicepresidente": 3,
    "directivo": 2,
    "gestor": 2,      # mismo nivel que directivo para permisos de carga
    "profesional": 1,
}


def role_required(*roles):
    """Permite acceso solo a los roles especificados."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(int(user_id))
            if not user or not user.activo:
                return jsonify({"error": "Usuario no encontrado o inactivo"}), 401
            if user.rol != "administrador" and user.rol not in roles:
                return jsonify({"error": "No tiene permisos para esta acción"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def min_role(min_rol):
    """Permite acceso a usuarios con rol igual o superior al mínimo indicado."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(int(user_id))
            if not user or not user.activo:
                return jsonify({"error": "Usuario no encontrado o inactivo"}), 401
            if ROLES_HIERARCHY.get(user.rol, 0) < ROLES_HIERARCHY.get(min_rol, 0):
                return jsonify({"error": "No tiene permisos para esta acción"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def get_current_user():
    """Retorna el usuario actual desde el JWT."""
    user_id = get_jwt_identity()
    return User.query.get(int(user_id))
