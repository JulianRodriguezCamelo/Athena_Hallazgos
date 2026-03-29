from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from app.models.user import User
from app.utils.decorators import get_current_user

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email y contraseña son requeridos"}), 400

    user = User.query.filter_by(email=data["email"].lower().strip()).first()

    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Credenciales inválidas"}), 401

    if not user.activo:
        return jsonify({"error": "Usuario inactivo. Contacte al administrador"}), 403

    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "user": user.to_dict(),
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    # Con JWT stateless el logout se maneja en el cliente eliminando el token.
    # Aquí se puede implementar una blocklist si se requiere.
    return jsonify({"message": "Sesión cerrada exitosamente"}), 200
