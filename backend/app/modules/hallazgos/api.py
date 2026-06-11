from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.modules.hallazgos import controller
from app.utils.decorators import get_current_user, min_role
from app.extensions import limiter

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
        "estado": request.args.get("estado"),
        "dependencia": request.args.get("dependencia"),
        "vicepresidencia": request.args.get("vicepresidencia"),
        "direccion": request.args.get("direccion"),
        "fecha_cierre_desde": request.args.get("fecha_cierre_desde"),
        "fecha_cierre_hasta": request.args.get("fecha_cierre_hasta"),
        "fecha_inicial_desde": request.args.get("fecha_inicial_desde"),
        "fecha_inicial_hasta": request.args.get("fecha_inicial_hasta"),
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


@hallazgos_bp.route("/actividades/<int:actividad_id>/notas", methods=["GET"])
@jwt_required()
def list_notas_actividad(actividad_id):
    user = get_current_user()
    notas = controller.list_notas_actividad(user, actividad_id)
    if notas is None:
        return jsonify({"error": "Actividad no encontrada o sin permisos"}), 404
    return jsonify({"notas": [n.to_dict() for n in notas]}), 200


@hallazgos_bp.route("/actividades/<int:actividad_id>/notas", methods=["POST"])
@jwt_required()
def add_nota_actividad(actividad_id):
    user = get_current_user()
    data = request.get_json() or {}
    nota, error = controller.add_nota_actividad(user, actividad_id, data.get("nota", ""))
    if error:
        status = 404 if "encontrada" in error or "permisos" in error else 400
        return jsonify({"error": error}), status
    return jsonify({"nota": nota.to_dict()}), 201


@hallazgos_bp.route("/checklist", methods=["GET"])
@jwt_required()
def get_checklist():
    user = get_current_user()
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 15))
    return jsonify(controller.get_checklist(user, page, per_page)), 200


@hallazgos_bp.route("/actividades/<int:actividad_id>/checklist", methods=["GET"])
@jwt_required()
def list_checklist(actividad_id):
    user = get_current_user()
    items, error = controller.list_checklist_items(user, actividad_id)
    if error:
        status = 404 if "encontrada" in error or "permisos" in error else 400
        return jsonify({"error": error}), status
    return jsonify({"items": [i.to_dict() for i in items]}), 200


@hallazgos_bp.route("/actividades/<int:actividad_id>/checklist", methods=["POST"])
@jwt_required()
def create_checklist(actividad_id):
    user = get_current_user()
    data = request.get_json() or {}
    item, error = controller.create_checklist_item(user, actividad_id, data.get("descripcion", ""))
    if error:
        status = 403 if "permisos" in error else 404 if "encontrada" in error else 400
        return jsonify({"error": error}), status
    return jsonify({"item": item.to_dict()}), 201


@hallazgos_bp.route("/checklist/<int:item_id>/complete", methods=["PATCH"])
@jwt_required()
def complete_checklist(item_id):
    user = get_current_user()
    data = request.get_json() or {}
    item, error = controller.complete_checklist_item(user, item_id, data.get("link_evidencia"))
    if error:
        status = 403 if "permisos" in error else 404 if "encontrado" in error else 400
        return jsonify({"error": error}), status
    return jsonify({"item": item.to_dict()}), 200


@hallazgos_bp.route("/checklist/<int:item_id>/reopen", methods=["PATCH"])
@jwt_required()
def reopen_checklist(item_id):
    user = get_current_user()
    item, error = controller.reopen_checklist_item(user, item_id)
    if error:
        status = 403 if "permisos" in error else 404 if "encontrado" in error else 400
        return jsonify({"error": error}), status
    return jsonify({"item": item.to_dict()}), 200


@hallazgos_bp.route("/checklist/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_checklist(item_id):
    user = get_current_user()
    ok, error = controller.delete_checklist_item(user, item_id)
    if error:
        status = 403 if "permisos" in error else 404 if "encontrado" in error else 400
        return jsonify({"error": error}), status
    return jsonify({"message": "Ítem eliminado"}), 200


@hallazgos_bp.route("/<int:hallazgo_id>/history", methods=["GET"])
@jwt_required()
def get_hallazgo_history(hallazgo_id):
    user = get_current_user()
    history = controller.get_hallazgo_history(user, hallazgo_id)
    if history is None:
        return jsonify({"error": "Hallazgo no encontrado o sin permisos"}), 404
    return jsonify({"history": history}), 200


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


@hallazgos_bp.route("/export", methods=["GET"])
@jwt_required()
@limiter.limit("5 per minute; 30 per hour")
def export_hallazgos():
    """Exporta los hallazgos filtrados como CSV o Excel.
    Parámetros: format=csv|xlsx (default csv), más los mismos filtros de list_hallazgos.
    """
    user = get_current_user()
    fmt = request.args.get("format", "csv").lower()
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
        "solo_activos": request.args.get("solo_activos"),
    }
    return controller.export_hallazgos(user, filters, fmt)
