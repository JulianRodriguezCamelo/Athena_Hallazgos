from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.modules.dashboard import controller
from app.utils.decorators import get_current_user

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.route("/metrics", methods=["GET"])
@jwt_required()
def metrics():
    return jsonify(controller.get_metrics(get_current_user())), 200


@dashboard_bp.route("/por-estado", methods=["GET"])
@jwt_required()
def por_estado():
    return jsonify({"data": controller.get_por_estado(get_current_user())}), 200


@dashboard_bp.route("/por-dependencia", methods=["GET"])
@jwt_required()
def por_dependencia():
    return jsonify({"data": controller.get_por_dependencia(get_current_user())}), 200


@dashboard_bp.route("/por-responsable", methods=["GET"])
@jwt_required()
def por_responsable():
    return jsonify({"data": controller.get_por_responsable(get_current_user())}), 200


@dashboard_bp.route("/por-estado-plan", methods=["GET"])
@jwt_required()
def por_estado_plan():
    return jsonify({"data": controller.get_por_estado_plan(get_current_user())}), 200


@dashboard_bp.route("/timeline", methods=["GET"])
@jwt_required()
def timeline():
    return jsonify({"data": controller.get_timeline(get_current_user())}), 200


@dashboard_bp.route("/prorrogas", methods=["GET"])
@jwt_required()
def prorrogas():
    return jsonify(controller.get_prorrogas(get_current_user())), 200


@dashboard_bp.route("/uploads-recientes", methods=["GET"])
@jwt_required()
def uploads_recientes():
    uploads = controller.get_uploads_recientes(get_current_user())
    return jsonify({"uploads": [u.to_dict() for u in uploads]}), 200


# ─── Directivo ─────────────────────────────────────────────────────────────────

@dashboard_bp.route("/directivo/mis-metricas", methods=["GET"])
@jwt_required()
def directivo_mis_metricas():
    return jsonify(controller.directivo_mis_metricas(get_current_user())), 200


@dashboard_bp.route("/directivo/mis-hallazgos", methods=["GET"])
@jwt_required()
def directivo_mis_hallazgos():
    user = get_current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    pag = controller.directivo_mis_hallazgos(user, page, per_page)
    return jsonify({
        "hallazgos": [h.to_dict() for h in pag.items],
        "total": pag.total, "page": page, "pages": pag.pages,
    }), 200


@dashboard_bp.route("/directivo/mis-actividades", methods=["GET"])
@jwt_required()
def directivo_mis_actividades():
    user = get_current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    pag = controller.directivo_mis_actividades(user, page, per_page)
    return jsonify({
        "actividades": [a.to_dict() for a in pag.items],
        "total": pag.total, "page": page, "pages": pag.pages,
    }), 200


@dashboard_bp.route("/directivo/menciones", methods=["GET"])
@jwt_required()
def directivo_menciones():
    user = get_current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    pag = controller.directivo_menciones(user, page, per_page)
    return jsonify({
        "hallazgos": [h.to_dict() for h in pag.items],
        "total": pag.total, "page": page, "pages": pag.pages,
    }), 200


@dashboard_bp.route("/directivo/por-estado-accion", methods=["GET"])
@jwt_required()
def directivo_por_estado_accion():
    return jsonify({"data": controller.directivo_por_estado_accion(get_current_user())}), 200


# ─── Gestor ────────────────────────────────────────────────────────────────────

@dashboard_bp.route("/gestor/mis-metricas", methods=["GET"])
@jwt_required()
def gestor_mis_metricas():
    return jsonify(controller.gestor_mis_metricas(get_current_user())), 200


@dashboard_bp.route("/gestor/por-estado", methods=["GET"])
@jwt_required()
def gestor_por_estado():
    return jsonify({"data": controller.gestor_por_estado(get_current_user())}), 200


@dashboard_bp.route("/gestor/por-estado-plan", methods=["GET"])
@jwt_required()
def gestor_por_estado_plan():
    return jsonify({"data": controller.gestor_por_estado_plan(get_current_user())}), 200


@dashboard_bp.route("/gestor/por-semaforo", methods=["GET"])
@jwt_required()
def gestor_por_semaforo():
    return jsonify({"data": controller.gestor_por_semaforo(get_current_user())}), 200


@dashboard_bp.route("/gestor/hallazgos", methods=["GET"])
@jwt_required()
def gestor_hallazgos():
    user = get_current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    pag, now = controller.gestor_hallazgos(user, page, per_page)
    return jsonify({
        "hallazgos": [controller._enrich_hallazgo(h, now) for h in pag.items],
        "total": pag.total, "page": page, "pages": pag.pages,
    }), 200


@dashboard_bp.route("/gestor/actividades", methods=["GET"])
@jwt_required()
def gestor_actividades():
    user = get_current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 100, type=int)
    pag = controller.gestor_actividades(user, page, per_page)
    return jsonify({
        "actividades": [a.to_dict() for a in pag.items],
        "total": pag.total, "page": page, "pages": pag.pages,
    }), 200


@dashboard_bp.route("/gestor/responsables-criticos", methods=["GET"])
@jwt_required()
def gestor_responsables_criticos():
    return jsonify({"data": controller.gestor_responsables_criticos(get_current_user())}), 200


@dashboard_bp.route("/gestor/enviar-recordatorios", methods=["POST"])
@jwt_required()
def gestor_enviar_recordatorios():
    return jsonify(controller.gestor_enviar_recordatorios(get_current_user())), 200


@dashboard_bp.route("/gestor/bitacora", methods=["GET"])
@jwt_required()
def gestor_bitacora():
    return jsonify({"entries": controller.gestor_bitacora(get_current_user())}), 200


@dashboard_bp.route("/gestor/tiempo-promedio", methods=["GET"])
@jwt_required()
def gestor_tiempo_promedio():
    return jsonify({"data": controller.gestor_tiempo_promedio(get_current_user())}), 200
