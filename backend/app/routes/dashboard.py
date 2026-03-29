from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func, case
from app.extensions import db
from app.models.hallazgo import Hallazgo
from app.models.upload_history import UploadHistory
from app.utils.decorators import get_current_user

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


def _base_query(user):
    """Retorna la query base filtrada por rol."""
    query = Hallazgo.query
    if user.rol == "vicepresidente":
        return query

    # Directivo y técnico: filtrar por vicepresidencia
    if user.rol in ("directivo", "tecnico"):
        if user.vicepresidencia:
            return query.filter(Hallazgo.vicepresidencia == user.vicepresidencia)
        if user.rol == "directivo" and user.dependencia:
            return query.filter(Hallazgo.dependencia_reporta_ero == user.dependencia)
        return query.filter(db.false())

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

    results = (
        db.session.query(
            Hallazgo.responsable_plan_accion,
            func.count(Hallazgo.id).label("total"),
        )
        .filter(Hallazgo.responsable_plan_accion.isnot(None))
        .filter(Hallazgo.id.in_(q.with_entities(Hallazgo.id)))
        .group_by(Hallazgo.responsable_plan_accion)
        .order_by(func.count(Hallazgo.id).desc())
        .limit(15)
        .all()
    )

    return jsonify({
        "data": [
            {"responsable": r.responsable_plan_accion, "total": r.total}
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


@dashboard_bp.route("/uploads-recientes", methods=["GET"])
@jwt_required()
def uploads_recientes():
    user = get_current_user()
    query = UploadHistory.query
    if user.rol == "directivo":
        query = query.filter_by(uploaded_by_id=user.id)

    uploads = query.order_by(UploadHistory.uploaded_at.desc()).limit(5).all()
    return jsonify({"uploads": [u.to_dict() for u in uploads]}), 200
