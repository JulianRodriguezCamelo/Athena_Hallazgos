from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.hallazgo import Hallazgo
from app.models.actividad import Actividad
from app.utils.decorators import get_current_user, min_role
from datetime import datetime, timezone

hallazgos_bp = Blueprint("hallazgos", __name__, url_prefix="/api/hallazgos")


def _apply_role_filter(query, user):
    """Filtra hallazgos según el rol del usuario."""
    if user.rol == "vicepresidente":
        return query  # Ve todo

    if user.rol in ("directivo", "tecnico"):
        # Filtrar por vicepresidencia si está configurada en el usuario
        if user.vicepresidencia:
            return query.filter(
                Hallazgo.vicepresidencia == user.vicepresidencia
            )
        # Fallback: filtrar por dependencia (directivo y técnico)
        if user.dependencia:
            return query.filter(
                Hallazgo.dependencia_reporta_ero == user.dependencia
            )
        # Sin restricciones configuradas: ve todo
        return query

    return query.filter(db.false())


@hallazgos_bp.route("/", methods=["GET"])
@jwt_required()
def list_hallazgos():
    user = get_current_user()
    query = _apply_role_filter(Hallazgo.query, user)

    # Filtros opcionales
    estado = request.args.get("estado")
    dependencia = request.args.get("dependencia")
    vicepresidencia = request.args.get("vicepresidencia")
    responsable = request.args.get("responsable")
    estado_plan = request.args.get("estado_plan_accion")
    search = request.args.get("search")
    vencido = request.args.get("vencido")
    con_prorroga = request.args.get("con_prorroga")
    fecha_cierre_desde = request.args.get("fecha_cierre_desde")
    fecha_cierre_hasta = request.args.get("fecha_cierre_hasta")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))

    if estado:
        query = query.filter(Hallazgo.estado.ilike(f"%{estado}%"))
    if dependencia and user.rol == "vicepresidente":
        query = query.filter(Hallazgo.dependencia_reporta_ero.ilike(f"%{dependencia}%"))
    if vicepresidencia and user.rol == "vicepresidente":
        query = query.filter(Hallazgo.vicepresidencia.ilike(f"%{vicepresidencia}%"))
    if responsable:
        query = query.filter(
            db.or_(
                Hallazgo.responsable_plan_accion.ilike(f"%{responsable}%"),
                Hallazgo.responsable_accion.ilike(f"%{responsable}%"),
            )
        )
    if estado_plan:
        query = query.filter(Hallazgo.estado_plan_accion.ilike(f"%{estado_plan}%"))
    if search:
        query = query.filter(
            db.or_(
                Hallazgo.codigo_evento.ilike(f"%{search}%"),
                Hallazgo.descripcion.ilike(f"%{search}%"),
                Hallazgo.nombre_plan_accion.ilike(f"%{search}%"),
            )
        )
    if vencido == "true":
        query = query.filter(
            Hallazgo.fecha_cierre_proyectada < datetime.now(timezone.utc),
            ~Hallazgo.estado.ilike("%cerrado%"),
            ~Hallazgo.estado.ilike("%cerrada%"),
        )
    if con_prorroga == "true":
        query = query.filter(
            Hallazgo.prorroga.isnot(None),
            Hallazgo.prorroga != "",
        )
    if fecha_cierre_desde:
        try:
            dt = datetime.strptime(fecha_cierre_desde, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            query = query.filter(Hallazgo.fecha_cierre_proyectada >= dt)
        except ValueError:
            pass
    if fecha_cierre_hasta:
        try:
            dt = datetime.strptime(fecha_cierre_hasta, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            query = query.filter(Hallazgo.fecha_cierre_proyectada <= dt)
        except ValueError:
            pass

    query = query.order_by(Hallazgo.fecha_inicial_evento.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "hallazgos": [h.to_dict() for h in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": paginated.page,
        "per_page": paginated.per_page,
    }), 200


@hallazgos_bp.route("/<int:hallazgo_id>", methods=["GET"])
@jwt_required()
def get_hallazgo(hallazgo_id):
    user = get_current_user()
    query = _apply_role_filter(Hallazgo.query, user)
    hallazgo = query.filter_by(id=hallazgo_id).first()

    if not hallazgo:
        return jsonify({"error": "Hallazgo no encontrado o sin permisos"}), 404

    return jsonify({"hallazgo": hallazgo.to_dict()}), 200


@hallazgos_bp.route("/<int:hallazgo_id>", methods=["PUT"])
@jwt_required()
@min_role("directivo")
def update_hallazgo(hallazgo_id):
    user = get_current_user()
    query = _apply_role_filter(Hallazgo.query, user)
    hallazgo = query.filter_by(id=hallazgo_id).first()

    if not hallazgo:
        return jsonify({"error": "Hallazgo no encontrado o sin permisos"}), 404

    data = request.get_json()
    campos_editables = [
        "estado", "observaciones", "estado_plan_accion",
        "responsable_plan_accion", "estado_accion", "responsable_accion",
        "prorroga", "fecha_cierre_final_prorroga", "fecha_cierre_proyectada",
    ]
    for campo in campos_editables:
        if campo in data:
            setattr(hallazgo, campo, data[campo])

    db.session.commit()
    return jsonify({"message": "Hallazgo actualizado", "hallazgo": hallazgo.to_dict()}), 200


@hallazgos_bp.route("/<int:hallazgo_id>/actividades", methods=["GET"])
@jwt_required()
def get_actividades(hallazgo_id):
    """Retorna las actividades de un hallazgo."""
    user = get_current_user()
    query = _apply_role_filter(Hallazgo.query, user)
    hallazgo = query.filter_by(id=hallazgo_id).first()

    if not hallazgo:
        return jsonify({"error": "Hallazgo no encontrado o sin permisos"}), 404

    actividades = Actividad.query.filter_by(hallazgo_id=hallazgo_id).all()
    return jsonify({"actividades": [a.to_dict() for a in actividades]}), 200


@hallazgos_bp.route("/estados", methods=["GET"])
@jwt_required()
def get_estados():
    """Retorna los valores únicos de estado para filtros."""
    user = get_current_user()
    query = _apply_role_filter(Hallazgo.query, user)
    estados = db.session.query(Hallazgo.estado).filter(
        Hallazgo.estado.isnot(None)
    ).filter(Hallazgo.id.in_(query.with_entities(Hallazgo.id))).distinct().all()
    return jsonify({"estados": [e[0] for e in estados if e[0]]}), 200


@hallazgos_bp.route("/dependencias", methods=["GET"])
@jwt_required()
def get_dependencias():
    """Retorna las dependencias únicas."""
    user = get_current_user()
    query = _apply_role_filter(Hallazgo.query, user)
    dependencias = db.session.query(Hallazgo.dependencia_reporta_ero).filter(
        Hallazgo.dependencia_reporta_ero.isnot(None)
    ).filter(Hallazgo.id.in_(query.with_entities(Hallazgo.id))).distinct().all()
    return jsonify({"dependencias": [d[0] for d in dependencias if d[0]]}), 200


@hallazgos_bp.route("/vicepresidencias", methods=["GET"])
@jwt_required()
def get_vicepresidencias():
    """Retorna las vicepresidencias únicas presentes en los datos."""
    vicepresidencias = db.session.query(Hallazgo.vicepresidencia).filter(
        Hallazgo.vicepresidencia.isnot(None)
    ).distinct().order_by(Hallazgo.vicepresidencia).all()
    return jsonify({"vicepresidencias": [v[0] for v in vicepresidencias if v[0]]}), 200

@hallazgos_bp.route("/responsables", methods=["GET"])
@jwt_required()
def get_responsables():
    """Retorna los responsables únicos presentes en los datos."""
    user = get_current_user()
    query = _apply_role_filter(Hallazgo.query, user)
    responsables = db.session.query(Hallazgo.responsable_plan_accion).filter(
        Hallazgo.responsable_plan_accion.isnot(None)
    ).filter(Hallazgo.id.in_(query.with_entities(Hallazgo.id))).distinct().order_by(Hallazgo.responsable_plan_accion).all()
    return jsonify({"responsables": [r[0] for r in responsables if r[0]]}), 200

@hallazgos_bp.route("/estados_plan", methods=["GET"])
@jwt_required()
def get_estados_plan():
    """Retorna los estados del plan únicos presentes en los datos."""
    user = get_current_user()
    query = _apply_role_filter(Hallazgo.query, user)
    estados = db.session.query(Hallazgo.estado_plan_accion).filter(
        Hallazgo.estado_plan_accion.isnot(None)
    ).filter(Hallazgo.id.in_(query.with_entities(Hallazgo.id))).distinct().order_by(Hallazgo.estado_plan_accion).all()
    return jsonify({"estados_plan_accion": [e[0] for e in estados if e[0]]}), 200
