from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.modules.auth import controller
from app.extensions import limiter

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("10 per minute; 50 per hour")
def login():
    data = request.get_json()
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email y contraseña son requeridos"}), 400
    result, error = controller.login(data["email"], data["password"])
    if error:
        status = 403 if "inactivo" in error else 401
        return jsonify({"error": error}), status
    return jsonify(result), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user_data = controller.get_me(user_id)
    if not user_data:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify({"user": user_data}), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Invalida el token actual añadiendo su JTI al blocklist."""
    jti = get_jwt().get("jti")
    controller.revoke_token(jti)
    return jsonify({"message": "Sesión cerrada exitosamente"}), 200
