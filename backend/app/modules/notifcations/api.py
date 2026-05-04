from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.modules.notifcations import controller
from app.utils.decorators import get_current_user, role_required

notifications_bp = Blueprint("notificaciones", __name__, url_prefix="/api/notificaciones")


@notifications_bp.route("/", methods=["GET"])
@jwt_required()
def list_notificaciones():
    user = get_current_user()
    notificaciones = controller.get_notificaciones(user)
    return jsonify([n.to_dict() for n in notificaciones]), 200


@notifications_bp.route("/", methods=["POST"])
@jwt_required()
def create_notificacion():
    user = get_current_user()
    data = request.get_json()
    notificacion = controller.crear_notificacion(user, data)
    return jsonify(notificacion.to_dict()), 201


@notifications_bp.route("/alertar-vencimiento", methods=["POST"])
@jwt_required()
@role_required("gestor", "directivo", "vicepresidente")
def alertar_vencimiento():
    """
    Body: { "tipo": "hallazgo" | "actividad", "entity_id": int }
    """
    gestor = get_current_user()
    data = request.get_json()
    resultado = controller.alertar_vencimiento(gestor, data)
    if isinstance(resultado, tuple):
        _, error = resultado
        return jsonify({"error": error}), 400
    return jsonify(resultado), 200


@notifications_bp.route("/<int:notif_id>/read", methods=["PATCH"])
@jwt_required()
def mark_read(notif_id: int):
    user = get_current_user()
    result = controller.mark_as_read(user, notif_id)
    if result is None:
        return jsonify({"error": "No encontrada"}), 404
    return jsonify(result.to_dict()), 200


@notifications_bp.route("/read-all", methods=["PATCH"])
@jwt_required()
def mark_all_read():
    user = get_current_user()
    count = controller.mark_all_as_read(user)
    return jsonify({"marked": count}), 200


@notifications_bp.route("/enviar-personalizada", methods=["POST"])
@jwt_required()
@role_required("gestor", "directivo", "vicepresidente")
def enviar_personalizada():
    """
    Body: { "nombre": str, "correo": str, "direccion": str, "hallazgo": str, "estado_notas": str }
    """
    gestor = get_current_user()
    data = request.get_json()
    resultado = controller.enviar_personalizada(gestor, data)
    if isinstance(resultado, tuple):
        _, error = resultado
        return jsonify({"error": error}), 400
    return jsonify(resultado), 200


@notifications_bp.route("/resumen-semanal", methods=["POST"])
@jwt_required()
@role_required("vicepresidente")
def trigger_resumen_semanal():
    resultado = controller.trigger_resumen_semanal()
    return jsonify(resultado), 200

@notifications_bp.route("/usuarios-para-masivo", methods=["GET"])
@jwt_required()
@role_required("gestor", "directivo", "vicepresidente")
def get_usuarios_para_masivo():
    current_user = get_current_user()
    dependencia = request.args.get("dependencia", "").strip() or None
    usuarios = controller.usuarios_para_masivo(current_user, dependencia)
    return jsonify({"usuarios": usuarios}), 200


@notifications_bp.route("/enviar-masiva", methods=["POST"])
@jwt_required()
@role_required("gestor", "directivo", "vicepresidente")
def enviar_masiva():
    """
    Body: { "user_ids": [int], "asunto": str, "mensaje": str }
    """
    gestor = get_current_user()
    data = request.get_json()
    resultado, error = controller.enviar_masiva(gestor, data)
    if error:
        return jsonify({"error": error}), 400
    return jsonify(resultado), 200


@notifications_bp.route("/test-scheduler", methods=["POST"])
@jwt_required()
def test_scheduler():
    from app.modules.scheduler.scheduler import scheduler
    for job in scheduler.get_jobs():
        job.func()
    return jsonify({"ok": True, "jobs": [j.id for j in scheduler.get_jobs()]}), 200