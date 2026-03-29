from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.user import User
from app.utils.decorators import role_required, get_current_user

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("vicepresidente", "directivo")
def list_users():
    current_user = get_current_user()
    query = User.query

    # Directivo solo ve técnicos de su dependencia
    if current_user.rol == "directivo":
        query = query.filter_by(dependencia=current_user.dependencia)

    users = query.order_by(User.nombre).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200


@users_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
@role_required("vicepresidente", "directivo")
def get_user(user_id):
    current_user = get_current_user()
    user = User.query.get_or_404(user_id)

    if current_user.rol == "directivo" and user.dependencia != current_user.dependencia:
        return jsonify({"error": "No tiene permisos para ver este usuario"}), 403

    return jsonify({"user": user.to_dict()}), 200


@users_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("vicepresidente")
def create_user():
    data = request.get_json()
    required = ["nombre", "email", "password", "rol"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"El campo '{field}' es requerido"}), 400

    if data["rol"] not in ("vicepresidente", "directivo", "tecnico"):
        return jsonify({"error": "Rol inválido"}), 400

    if User.query.filter_by(email=data["email"].lower().strip()).first():
        return jsonify({"error": "El email ya está registrado"}), 409

    user = User(
        nombre=data["nombre"].strip(),
        email=data["email"].lower().strip(),
        rol=data["rol"],
        vicepresidencia=data.get("vicepresidencia", "").strip() or None,
        dependencia=data.get("dependencia", "").strip() or None,
        activo=data.get("activo", True),
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Usuario creado exitosamente", "user": user.to_dict()}), 201


@users_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
@role_required("vicepresidente")
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if "nombre" in data:
        user.nombre = data["nombre"].strip()
    if "email" in data:
        existing = User.query.filter_by(email=data["email"].lower().strip()).first()
        if existing and existing.id != user_id:
            return jsonify({"error": "El email ya está en uso"}), 409
        user.email = data["email"].lower().strip()
    if "rol" in data:
        if data["rol"] not in ("vicepresidente", "directivo", "tecnico"):
            return jsonify({"error": "Rol inválido"}), 400
        user.rol = data["rol"]
    if "vicepresidencia" in data:
        user.vicepresidencia = data["vicepresidencia"].strip() or None
    if "dependencia" in data:
        user.dependencia = data["dependencia"].strip() or None
    if "activo" in data:
        user.activo = bool(data["activo"])
    if "password" in data and data["password"]:
        user.set_password(data["password"])

    db.session.commit()
    return jsonify({"message": "Usuario actualizado", "user": user.to_dict()}), 200


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
@role_required("vicepresidente")
def delete_user(user_id):
    current_user = get_current_user()
    if current_user.id == user_id:
        return jsonify({"error": "No puede eliminar su propio usuario"}), 400

    user = User.query.get_or_404(user_id)
    user.activo = False  # Soft delete
    db.session.commit()
    return jsonify({"message": "Usuario desactivado exitosamente"}), 200
