from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.modules.users import controller
from app.utils.decorators import role_required, get_current_user, min_role
from app.extensions import db

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("administrador")
def list_users():
    current_user = get_current_user()
    users = controller.list_users(current_user)
    return jsonify({"users": users}), 200


@users_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
@role_required("administrador")
def get_user(user_id):
    current_user = get_current_user()
    user_data, error = controller.get_user(user_id, current_user)
    if error:
        return jsonify({"error": error}), 403
    return jsonify({"user": user_data}), 200


@users_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("administrador")
def create_user():
    data = request.get_json()
    user_data, error = controller.create_user(data)
    if error:
        status = 409 if "registrado" in error or "uso" in error else 400
        return jsonify({"error": error}), status
    return jsonify({"message": "Usuario creado exitosamente", "user": user_data}), 201


@users_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
@role_required("administrador")
def update_user(user_id):
    data = request.get_json()
    user_data, error = controller.update_user(user_id, data)
    if error:
        status = 409 if "uso" in error else 400
        return jsonify({"error": error}), status
    return jsonify({"message": "Usuario actualizado", "user": user_data}), 200


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@role_required("administrador")
def delete_user(user_id):
    current_user = get_current_user()
    success, error = controller.delete_user(user_id, current_user.id)
    if not success:
        return jsonify({"error": error}), 400
    return jsonify({"message": "Usuario desactivado exitosamente"}), 200

@users_bp.route("/reset", methods=["DELETE"])
@jwt_required()
@role_required("administrador")
def reset_users():
    result = controller.reset_non_admin_users()
    return jsonify({"message": f"Se eliminaron {result['eliminados']} usuarios", **result}), 200


@users_bp.route("/bulk-upload", methods=["POST"])
@jwt_required()
@role_required("administrador")
def bulk_upload_users():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No se envió ningún archivo"}), 400
    result = controller.bulk_upload_users(file)
    if "error" in result and "creados" not in result:
        return jsonify(result), 400
    return jsonify(result), 201


@users_bp.route("/dependencias", methods=["GET"])
@jwt_required()
@role_required("administrador")
def list_dependencias():
    current_user = get_current_user()
    dependencias = controller.distinct_dependencias_user(current_user)
    return jsonify({"dependencias": dependencias}), 200


@users_bp.route("/active", methods=["GET"])
@jwt_required()
@min_role("directivo")
def list_active_users():
    """Lista mínima de usuarios activos para dropdowns (directivo+)."""
    from app.models.user import User
    users = User.query.filter_by(activo=True).order_by(User.nombre).all()
    return jsonify({"users": [{"id": u.id, "nombre": u.nombre} for u in users]}), 200


@users_bp.route("/me/preferences", methods=["GET"])
@jwt_required()
@role_required("administrador", "vicepresidente", "directivo")
def get_my_preferences():
    current_user = get_current_user()
    from app.models.user_preferences import UserPreferences
    prefs = UserPreferences.query.filter_by(user_id=current_user.id).first()
    layout = prefs.dashboard_layout if prefs else None
    return jsonify({"preferences": {"dashboard_layout": layout}}), 200


@users_bp.route("/me/preferences", methods=["PUT"])
@jwt_required()
@role_required("administrador", "vicepresidente", "directivo")
def save_my_preferences():
    current_user = get_current_user()
    data = request.get_json()
    layout = data.get("dashboard_layout")
    if not isinstance(layout, list):
        return jsonify({"error": "dashboard_layout debe ser un array"}), 400
    from app.models.user_preferences import UserPreferences
    from app.extensions import db
    prefs = UserPreferences.query.filter_by(user_id=current_user.id).first()
    if prefs is None:
        prefs = UserPreferences(user_id=current_user.id, dashboard_layout=layout)
        db.session.add(prefs)
    else:
        prefs.dashboard_layout = layout
    db.session.commit()
    return jsonify({"preferences": {"dashboard_layout": prefs.dashboard_layout}}), 200
