from sqlalchemy import func
from app.extensions import db
from app.models.hallazgo import Hallazgo
from app.models.actividad import Actividad
from app.modules.hallazgos.service import apply_role_filter


def base_query(user):
    query = Hallazgo.query
    if user.rol == "vicepresidente":
        return query
    if user.rol in ("directivo", "profesional"):
        if user.vicepresidencia:
            return query.filter(Hallazgo.vicepresidencia.ilike(user.vicepresidencia))
        if user.dependencia:
            return query.filter(Hallazgo.dependencia_reporta_ero.ilike(user.dependencia))
        return query
    if user.rol == "gestor":
        return gestor_query(user)
    return query.filter(db.false())


def gestor_query(user):
    nombre = user.nombre
    conditions = []
    if user.dependencia:
        conditions.append(Hallazgo.dependencia_reporta_ero == user.dependencia)
    conditions.append(Hallazgo.responsable_plan_accion.ilike(f"%{nombre}%"))
    conditions.append(Hallazgo.responsable_accion.ilike(f"%{nombre}%"))
    return Hallazgo.query.filter(db.or_(*conditions))


def count_por_estado(hallazgo_ids):
    return (
        db.session.query(Hallazgo.estado, func.count(Hallazgo.id).label("total"))
        .filter(Hallazgo.estado.isnot(None))
        .filter(Hallazgo.id.in_(hallazgo_ids))
        .group_by(Hallazgo.estado)
        .order_by(func.count(Hallazgo.id).desc())
        .all()
    )


def count_por_dependencia(hallazgo_ids):
    area = func.coalesce(Hallazgo.dependencia_reporta_ero, Hallazgo.direccion).label("area")
    return (
        db.session.query(area, func.count(Hallazgo.id).label("total"))
        .filter(func.coalesce(Hallazgo.dependencia_reporta_ero, Hallazgo.direccion).isnot(None))
        .filter(Hallazgo.id.in_(hallazgo_ids))
        .group_by(area)
        .order_by(func.count(Hallazgo.id).desc())
        .limit(15)
        .all()
    )


def count_por_responsable(hallazgo_ids):
    return (
        db.session.query(
            func.coalesce(Hallazgo.responsable_plan_accion, Hallazgo.responsable_accion).label("responsable"),
            func.count(Hallazgo.id).label("total"),
        )
        .filter(func.coalesce(Hallazgo.responsable_plan_accion, Hallazgo.responsable_accion).isnot(None))
        .filter(Hallazgo.id.in_(hallazgo_ids))
        .group_by(func.coalesce(Hallazgo.responsable_plan_accion, Hallazgo.responsable_accion))
        .order_by(func.count(Hallazgo.id).desc())
        .limit(15)
        .all()
    )


def count_por_estado_plan(hallazgo_ids):
    return (
        db.session.query(Hallazgo.estado_plan_accion, func.count(Hallazgo.id).label("total"))
        .filter(Hallazgo.estado_plan_accion.isnot(None))
        .filter(Hallazgo.id.in_(hallazgo_ids))
        .group_by(Hallazgo.estado_plan_accion)
        .order_by(func.count(Hallazgo.id).desc())
        .all()
    )


def count_por_estado_accion(hallazgo_ids):
    return (
        db.session.query(Hallazgo.estado_accion, func.count(Hallazgo.id).label("total"))
        .filter(Hallazgo.estado_accion.isnot(None))
        .filter(Hallazgo.id.in_(hallazgo_ids))
        .group_by(Hallazgo.estado_accion)
        .order_by(func.count(Hallazgo.id).desc())
        .all()
    )


def timeline_por_mes(hallazgo_ids, desde):
    return (
        db.session.query(
            func.date_trunc("month", Hallazgo.fecha_inicial_evento).label("mes"),
            func.count(Hallazgo.id).label("total"),
        )
        .filter(Hallazgo.fecha_inicial_evento >= desde)
        .filter(Hallazgo.id.in_(hallazgo_ids))
        .group_by(func.date_trunc("month", Hallazgo.fecha_inicial_evento))
        .order_by(func.date_trunc("month", Hallazgo.fecha_inicial_evento))
        .all()
    )
