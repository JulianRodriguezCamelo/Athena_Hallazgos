from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.modules.uploads import controller
from app.utils.decorators import get_current_user, min_role, role_required

uploads_bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")


@uploads_bp.route("/", methods=["POST"])
@jwt_required()
@role_required("administrador")
def upload_excel():
    user = get_current_user()

    if "file" not in request.files:
        return jsonify({"error": "No se envió ningún archivo"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Nombre de archivo vacío"}), 400

    history, errors = controller.process_upload(user, file)
    if history is None:
        status = 409 if "proceso" in errors else 400
        return jsonify({"error": errors}), status

    return jsonify({
        "message": "Archivo procesado exitosamente",
        "upload": history.to_dict(),
        "errores": errors[:10],
    }), 201


@uploads_bp.route("/history", methods=["GET"])
@jwt_required()
@role_required("administrador")
def upload_history():
    user = get_current_user()
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    paginated = controller.get_history(user, page, per_page)
    return jsonify({
        "history": [h.to_dict() for h in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": paginated.page,
    }), 200


@uploads_bp.route("/history/<int:upload_id>", methods=["GET"])
@jwt_required()
@role_required("administrador")
def get_upload_detail(upload_id):
    user = get_current_user()
    upload, error = controller.get_upload_detail(user, upload_id)
    if error:
        return jsonify({"error": error}), 403
    return jsonify({"upload": upload.to_dict()}), 200


@uploads_bp.route("/history/<int:upload_id>", methods=["DELETE"])
@jwt_required()
@role_required("administrador")
def delete_upload(upload_id):
    user = get_current_user()
    success, error = controller.delete_upload(user, upload_id)
    if not success:
        return jsonify({"error": error}), 403
    return jsonify({"message": "Carga eliminada exitosamente"}), 200


@uploads_bp.route("/analyze", methods=["POST"])
@jwt_required()
def analyze_excel():
    if "file" not in request.files:
        return jsonify({"error": "No se envió ningún archivo"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Nombre de archivo vacío"}), 400

    result, error = controller.analyze_upload(file)
    if error:
        return jsonify({"error": error}), 400
    return jsonify(result), 200
