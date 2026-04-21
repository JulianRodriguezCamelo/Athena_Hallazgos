from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.modules.hallazgos import controller
from app.utils.decorators import get_current_user, min_role

hallazgos_bp = Blueprint("hallazgos", __name__, url_prefix="/api/hallazgos")


@hallazgos_bp.route("/", methods=["GET"])
@jwt_required()
def list_hallazgos():
    user = get_current_user()
    filters = {
        "estado": request.args.get("estado"),
        "dependencia": request.args.get("dependencia"),
        "vicepresidencia": request.args.get("vicepresidencia"),
        "direccion": request.args.get("direccion"),
        "responsable": request.args.get("responsable"),
        "estado_plan_accion": request.args.get("estado_plan_accion"),
        "search": request.args.get("search"),
        "vencido": request.args.get("vencido"),
        "con_prorroga": request.args.get("con_prorroga"),
        "fecha_cierre_desde": request.args.get("fecha_cierre_desde"),
        "fecha_cierre_hasta": request.args.get("fecha_cierre_hasta"),
        "fecha_inicial_desde": request.args.get("fecha_inicial_desde"),
        "fecha_inicial_hasta": request.args.get("fecha_inicial_hasta"),
    }
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    return jsonify(controller.list_hallazgos(user, filters, page, per_page)), 200


@hallazgos_bp.route("/<int:hallazgo_id>", methods=["GET"])
@jwt_required()
def get_hallazgo(hallazgo_id):
    user = get_current_user()
    hallazgo = controller.get_hallazgo(user, hallazgo_id)
    if not hallazgo:
        return jsonify({"error": "Hallazgo no encontrado o sin permisos"}), 404
    return jsonify({"hallazgo": hallazgo.to_dict()}), 200


@hallazgos_bp.route("/<int:hallazgo_id>", methods=["PUT"])
@jwt_required()
@min_role("directivo")
def update_hallazgo(hallazgo_id):
    user = get_current_user()
    hallazgo = controller.update_hallazgo(user, hallazgo_id, request.get_json())
    if not hallazgo:
        return jsonify({"error": "Hallazgo no encontrado o sin permisos"}), 404
    return jsonify({"message": "Hallazgo actualizado", "hallazgo": hallazgo.to_dict()}), 200


@hallazgos_bp.route("/<int:hallazgo_id>/actividades", methods=["GET"])
@jwt_required()
def get_actividades(hallazgo_id):
    user = get_current_user()
    actividades = controller.get_actividades(user, hallazgo_id)
    if actividades is None:
        return jsonify({"error": "Hallazgo no encontrado o sin permisos"}), 404
    return jsonify({"actividades": [a.to_dict() for a in actividades]}), 200


@hallazgos_bp.route("/actividades", methods=["GET"])
@jwt_required()
def list_all_actividades():
    user = get_current_user()
    filters = {
        "search": request.args.get("search"),
        "responsable": request.args.get("responsable"),
        "estado_plan_accion": request.args.get("estado_plan_accion"),
        "estado_accion": request.args.get("estado_accion"),
        "vencido": request.args.get("vencido"),
        "con_prorroga": request.args.get("con_prorroga"),
    }
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    return jsonify(controller.list_actividades(user, filters, page, per_page)), 200


@hallazgos_bp.route("/actividades/<int:actividad_id>/estado", methods=["PATCH"])
@jwt_required()
def patch_actividad_estado(actividad_id):
    user = get_current_user()
    data = request.get_json() or {}
    estado = data.get("estado_accion", "")
    actividad = controller.update_actividad_estado(user, actividad_id, estado)
    if actividad is None:
        return jsonify({"error": "Actividad no encontrada o sin permisos"}), 404
    return jsonify({"actividad": actividad.to_dict()}), 200


@hallazgos_bp.route("/checklist", methods=["GET"])
@jwt_required()
def get_checklist():
    user = get_current_user()
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 15))
    return jsonify(controller.get_checklist(user, page, per_page)), 200


@hallazgos_bp.route("/estados", methods=["GET"])
@jwt_required()
def get_estados():
    return jsonify({"estados": controller.get_estados(get_current_user())}), 200


@hallazgos_bp.route("/dependencias", methods=["GET"])
@jwt_required()
def get_dependencias():
    return jsonify({"dependencias": controller.get_dependencias(get_current_user())}), 200


@hallazgos_bp.route("/vicepresidencias", methods=["GET"])
@jwt_required()
def get_vicepresidencias():
    return jsonify({"vicepresidencias": controller.get_vicepresidencias()}), 200


@hallazgos_bp.route("/direcciones", methods=["GET"])
@jwt_required()
def get_direcciones():
    return jsonify({"direcciones": controller.get_direcciones(get_current_user())}), 200


@hallazgos_bp.route("/responsables", methods=["GET"])
@jwt_required()
def get_responsables():
    return jsonify({"responsables": controller.get_responsables(get_current_user())}), 200


@hallazgos_bp.route("/estados_plan", methods=["GET"])
@jwt_required()
def get_estados_plan():
    return jsonify({"estados_plan_accion": controller.get_estados_plan(get_current_user())}), 200
