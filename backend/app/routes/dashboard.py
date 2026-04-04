from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func, case
from app.extensions import db
from app.models.hallazgo import Hallazgo
from app.models.actividad import Actividad
from app.models.upload_history import UploadHistory
from app.utils.decorators import get_current_user

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def _base_query(user):
    """Retorna la query base filtrada por rol."""
    query = Hallazgo.query
    if user.rol == "vicepresidente":
        return query

    if user.rol in ("directivo", "tecnico"):
        # Filtrar por vicepresidencia si está configurada en el usuario
        if user.vicepresidencia:
            return query.filter(Hallazgo.vicepresidencia == user.vicepresidencia)
        # Fallback: filtrar por dependencia (directivo y técnico)
        if user.dependencia:
            return query.filter(Hallazgo.dependencia_reporta_ero == user.dependencia)
        # Sin restricciones configuradas: ve todo
        return query

    return query.filter(db.false())


@dashboard_bp.route("/metrics", methods=["GET"])
@jwt_required()
def metrics():
    user = get_current_user()
    q = _base_query(user)

    total = q.count()
    abiertas = q.filter(Hallazgo.estado.ilike("%abierto%")).count()
    cerradas = q.filter(Hallazgo.estado.ilike("%cerrado%")).count()

    hoy = datetime.now(timezone.utc).date()
    cerradas_hoy = q.filter(
        func.date(Hallazgo.fecha_cierre_proyectada) == hoy
    ).count()

    # Con prórroga activa
    con_prorroga = q.filter(
        Hallazgo.prorroga.isnot(None),
        Hallazgo.prorroga != "",
    ).count()

    # Planes vencidos (fecha_cierre_proyectada < hoy y estado != cerrado)
    vencidos = q.filter(
        Hallazgo.fecha_cierre_proyectada < datetime.now(timezone.utc),
        ~Hallazgo.estado.ilike("%cerrado%"),
    ).count()

    return jsonify({
        "total_hallazgos": total,
        "abiertas": abiertas,
        "cerradas": cerradas,
        "cerradas_hoy": cerradas_hoy,
        "con_prorroga": con_prorroga,
        "vencidos": vencidos,
    }), 200


@dashboard_bp.route("/por-estado", methods=["GET"])
@jwt_required()
def por_estado():
    user = get_current_user()
    q = _base_query(user)

    results = (
        db.session.query(Hallazgo.estado, func.count(Hallazgo.id).label("total"))
        .filter(Hallazgo.estado.isnot(None))
        .filter(Hallazgo.id.in_(q.with_entities(Hallazgo.id)))
        .group_by(Hallazgo.estado)
        .order_by(func.count(Hallazgo.id).desc())
        .all()
    )

    return jsonify({
        "data": [{"estado": r.estado, "total": r.total} for r in results]
    }), 200


@dashboard_bp.route("/por-dependencia", methods=["GET"])
@jwt_required()
def por_dependencia():
    user = get_current_user()
    q = _base_query(user)

    results = (
        db.session.query(
            Hallazgo.dependencia_reporta_ero,
            func.count(Hallazgo.id).label("total"),
        )
        .filter(Hallazgo.dependencia_reporta_ero.isnot(None))
        .filter(Hallazgo.id.in_(q.with_entities(Hallazgo.id)))
        .group_by(Hallazgo.dependencia_reporta_ero)
        .order_by(func.count(Hallazgo.id).desc())
        .limit(15)
        .all()
    )

    return jsonify({
        "data": [
            {"dependencia": r.dependencia_reporta_ero, "total": r.total}
            for r in results
        ]
    }), 200


@dashboard_bp.route("/por-responsable", methods=["GET"])
@jwt_required()
def por_responsable():
    user = get_current_user()
    q = _base_query(user)
    hallazgo_ids = q.with_entities(Hallazgo.id)

    results = (
        db.session.query(
            func.coalesce(
                Hallazgo.responsable_plan_accion,
                Hallazgo.responsable_accion,
            ).label("responsable"),
            func.count(Hallazgo.id).label("total"),
        )
        .filter(
            func.coalesce(
                Hallazgo.responsable_plan_accion,
                Hallazgo.responsable_accion,
            ).isnot(None)
        )
        .filter(Hallazgo.id.in_(hallazgo_ids))
        .group_by(
            func.coalesce(
                Hallazgo.responsable_plan_accion,
                Hallazgo.responsable_accion,
            )
        )
        .order_by(func.count(Hallazgo.id).desc())
        .limit(15)
        .all()
    )

    return jsonify({
        "data": [
            {"responsable": r.responsable, "total": r.total}
            for r in results
        ]
    }), 200


@dashboard_bp.route("/por-estado-plan", methods=["GET"])
@jwt_required()
def por_estado_plan():
    user = get_current_user()
    q = _base_query(user)

    results = (
        db.session.query(
            Hallazgo.estado_plan_accion,
            func.count(Hallazgo.id).label("total"),
        )
        .filter(Hallazgo.estado_plan_accion.isnot(None))
        .filter(Hallazgo.id.in_(q.with_entities(Hallazgo.id)))
        .group_by(Hallazgo.estado_plan_accion)
        .order_by(func.count(Hallazgo.id).desc())
        .all()
    )

    return jsonify({
        "data": [
            {"estado_plan": r.estado_plan_accion, "total": r.total}
            for r in results
        ]
    }), 200


@dashboard_bp.route("/timeline", methods=["GET"])
@jwt_required()
def timeline():
    """Hallazgos reportados por mes (últimos 12 meses)."""
    user = get_current_user()
    q = _base_query(user)

    hace_12_meses = datetime.now(timezone.utc) - timedelta(days=365)

    results = (
        db.session.query(
            func.date_trunc("month", Hallazgo.fecha_inicial_evento).label("mes"),
            func.count(Hallazgo.id).label("total"),
        )
        .filter(Hallazgo.fecha_inicial_evento >= hace_12_meses)
        .filter(Hallazgo.id.in_(q.with_entities(Hallazgo.id)))
        .group_by(func.date_trunc("month", Hallazgo.fecha_inicial_evento))
        .order_by(func.date_trunc("month", Hallazgo.fecha_inicial_evento))
        .all()
    )

    return jsonify({
        "data": [
            {
                "mes": r.mes.strftime("%Y-%m") if r.mes else None,
                "total": r.total,
            }
            for r in results
            if r.mes
        ]
    }), 200


@dashboard_bp.route("/prorrogas", methods=["GET"])
@jwt_required()
def prorrogas():
    """Hallazgos con prórroga activa."""
    user = get_current_user()
    q = _base_query(user)

    total_prorrogas = q.filter(
        Hallazgo.prorroga.isnot(None),
        Hallazgo.prorroga != "",
    ).count()

    vencidas = q.filter(
        Hallazgo.fecha_cierre_final_prorroga < datetime.now(timezone.utc),
        ~Hallazgo.estado.ilike("%cerrado%"),
    ).count()

    return jsonify({
        "total_prorrogas": total_prorrogas,
        "prorrogas_vencidas": vencidas,
    }), 200


def _mis_hallazgos_q(user):
    """Hallazgos donde el usuario es responsable (plan o acción)."""
    nombre = user.nombre
    return Hallazgo.query.filter(
        db.or_(
            Hallazgo.responsable_plan_accion.ilike(f"%{nombre}%"),
            Hallazgo.responsable_accion.ilike(f"%{nombre}%"),
        )
    )


@dashboard_bp.route("/directivo/mis-metricas", methods=["GET"])
@jwt_required()
def directivo_mis_metricas():
    user = get_current_user()
    q = _mis_hallazgos_q(user)
    now = datetime.now(timezone.utc)

    total = q.count()
    abiertas = q.filter(Hallazgo.estado.ilike("%abierto%")).count()
    cerradas = q.filter(Hallazgo.estado.ilike("%cerrado%")).count()
    vencidos = q.filter(
        Hallazgo.fecha_cierre_proyectada < now,
        ~Hallazgo.estado.ilike("%cerrado%"),
    ).count()
    con_prorroga = q.filter(
        Hallazgo.prorroga.isnot(None),
        Hallazgo.prorroga != "",
    ).count()

    nombre = user.nombre
    mis_actividades = Actividad.query.filter(
        db.or_(
            Actividad.responsable.ilike(f"%{nombre}%"),
            Actividad.responsable_accion.ilike(f"%{nombre}%"),
        )
    ).count()

    return jsonify({
        "total": total,
        "abiertas": abiertas,
        "cerradas": cerradas,
        "vencidos": vencidos,
        "con_prorroga": con_prorroga,
        "mis_actividades": mis_actividades,
    }), 200


@dashboard_bp.route("/directivo/mis-hallazgos", methods=["GET"])
@jwt_required()
def directivo_mis_hallazgos():
    user = get_current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    q = _mis_hallazgos_q(user).order_by(Hallazgo.fecha_cierre_proyectada.asc())
    pag = q.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "hallazgos": [h.to_dict() for h in pag.items],
        "total": pag.total,
        "page": page,
        "pages": pag.pages,
    }), 200


@dashboard_bp.route("/directivo/mis-actividades", methods=["GET"])
@jwt_required()
def directivo_mis_actividades():
    user = get_current_user()
    nombre = user.nombre
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    q = Actividad.query.filter(
        db.or_(
            Actividad.responsable.ilike(f"%{nombre}%"),
            Actividad.responsable_accion.ilike(f"%{nombre}%"),
        )
    ).order_by(Actividad.fecha_compromiso.asc())
    pag = q.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "actividades": [a.to_dict() for a in pag.items],
        "total": pag.total,
        "page": page,
        "pages": pag.pages,
    }), 200


@dashboard_bp.route("/directivo/menciones", methods=["GET"])
@jwt_required()
def directivo_menciones():
    """Hallazgos de otras áreas donde el usuario aparece como responsable."""
    user = get_current_user()
    nombre = user.nombre
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    q = Hallazgo.query.filter(
        db.or_(
            Hallazgo.responsable_plan_accion.ilike(f"%{nombre}%"),
            Hallazgo.responsable_accion.ilike(f"%{nombre}%"),
        )
    )
    if user.vicepresidencia:
        q = q.filter(Hallazgo.vicepresidencia != user.vicepresidencia)
    elif user.dependencia:
        q = q.filter(Hallazgo.dependencia_reporta_ero != user.dependencia)

    q = q.order_by(Hallazgo.fecha_cierre_proyectada.asc())
    pag = q.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "hallazgos": [h.to_dict() for h in pag.items],
        "total": pag.total,
        "page": page,
        "pages": pag.pages,
    }), 200


@dashboard_bp.route("/directivo/por-estado-accion", methods=["GET"])
@jwt_required()
def directivo_por_estado_accion():
    user = get_current_user()
    hallazgo_ids = _mis_hallazgos_q(user).with_entities(Hallazgo.id)

    results = (
        db.session.query(
            Hallazgo.estado_accion,
            func.count(Hallazgo.id).label("total"),
        )
        .filter(Hallazgo.estado_accion.isnot(None))
        .filter(Hallazgo.id.in_(hallazgo_ids))
        .group_by(Hallazgo.estado_accion)
        .order_by(func.count(Hallazgo.id).desc())
        .all()
    )

    return jsonify({
        "data": [{"estado": r.estado_accion, "total": r.total} for r in results]
    }), 200


@dashboard_bp.route("/uploads-recientes", methods=["GET"])
@jwt_required()
def uploads_recientes():
    user = get_current_user()
    query = UploadHistory.query
    if user.rol == "directivo":
        query = query.filter_by(uploaded_by_id=user.id)

    uploads = query.order_by(UploadHistory.uploaded_at.desc()).limit(5).all()
    return jsonify({"uploads": [u.to_dict() for u in uploads]}), 200
