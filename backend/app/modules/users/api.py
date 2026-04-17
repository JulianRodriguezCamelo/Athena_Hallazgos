from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.modules.users import controller
from app.utils.decorators import role_required, get_current_user

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("vicepresidente", "directivo")
def list_users():
    current_user = get_current_user()
    users = controller.list_users(current_user)
    return jsonify({"users": users}), 200


@users_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
@role_required("vicepresidente", "directivo")
def get_user(user_id):
    current_user = get_current_user()
    user_data, error = controller.get_user(user_id, current_user)
    if error:
        return jsonify({"error": error}), 403
    return jsonify({"user": user_data}), 200


@users_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("vicepresidente")
def create_user():
    data = request.get_json()
    user_data, error = controller.create_user(data)
    if error:
        status = 409 if "registrado" in error or "uso" in error else 400
        return jsonify({"error": error}), status
    return jsonify({"message": "Usuario creado exitosamente", "user": user_data}), 201


@users_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
@role_required("vicepresidente")
def update_user(user_id):
    data = request.get_json()
    user_data, error = controller.update_user(user_id, data)
    if error:
        status = 409 if "uso" in error else 400
        return jsonify({"error": error}), status
    return jsonify({"message": "Usuario actualizado", "user": user_data}), 200


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@role_required("vicepresidente")
def delete_user(user_id):
    current_user = get_current_user()
    success, error = controller.delete_user(user_id, current_user.id)
    if not success:
        return jsonify({"error": error}), 400
    return jsonify({"message": "Usuario desactivado exitosamente"}), 200
