from datetime import datetime, timezone
from sqlalchemy import func
from app.extensions import db
from app.models.hallazgo import Hallazgo
from app.models.actividad import Actividad
from app.utils import strip_accents as _strip_accents

FECHA_CORTE = datetime(2025, 1, 1, tzinfo=timezone.utc)

def _aplicar_corte(query):
    """Filtra hallazgos desde 2025 en adelante según fecha inicial del evento."""
    return query.filter(
        db.or_(
            Hallazgo.fecha_inicial_evento.is_(None),
            Hallazgo.fecha_inicial_evento >= FECHA_CORTE,
        )
    )


def _key_tokens(nombre: str) -> list[str]:
    """Retorna los últimos 2 tokens únicos significativos del nombre (apellidos), sin tildes."""
    seen: set[str] = set()
    unique: list[str] = []
    for t in nombre.strip().split():
        tl = _strip_accents(t).lower()
        if len(tl) > 2 and tl not in seen:
            seen.add(tl)
            unique.append(_strip_accents(t))
    return unique[-2:] if len(unique) >= 2 else unique


def _responsable_conditions(nombre: str):
    """Condiciones OR para buscar a una persona en los campos de responsable.
    Usa los 2 apellidos (últimos tokens únicos) para tolerar typos en el nombre de pila
    y diferencias de orden (apellido-primero vs nombre-primero)."""
    tokens = _key_tokens(nombre)
    nombre_norm = _strip_accents(nombre)
    if not tokens:
        return [
            Hallazgo.responsable_plan_accion.ilike(f"%{nombre_norm}%"),
            Hallazgo.responsable_accion.ilike(f"%{nombre_norm}%"),
        ]
    plan_cond = db.and_(*[Hallazgo.responsable_plan_accion.ilike(f"%{t}%") for t in tokens])
    accion_cond = db.and_(*[Hallazgo.responsable_accion.ilike(f"%{t}%") for t in tokens])
    return [plan_cond, accion_cond]


def base_query(user):
    query = _aplicar_corte(Hallazgo.query)
    if user.rol in ("vicepresidente", "administrador", "gestor"):
        return query
    if user.rol in ("directivo", "profesional"):
        return _aplicar_corte(profesional_query(user))
    return query.filter(db.false())


def _actividad_ids_para(nombre: str):
    """Sub-query: IDs de hallazgos donde el usuario tiene al menos una actividad asignada."""
    tokens = _key_tokens(nombre)
    nombre_norm = _strip_accents(nombre)
    if tokens:
        accion_cond = db.and_(*[Actividad.responsable_accion.ilike(f"%{t}%") for t in tokens])
        resp_cond   = db.and_(*[Actividad.responsable.ilike(f"%{t}%") for t in tokens])
    else:
        accion_cond = Actividad.responsable_accion.ilike(f"%{nombre_norm}%")
        resp_cond   = Actividad.responsable.ilike(f"%{nombre_norm}%")
    return db.session.query(Actividad.hallazgo_id).filter(
        db.or_(accion_cond, resp_cond)
    ).scalar_subquery()


def profesional_query(user):
    """Hallazgos donde el usuario es responsable del plan O tiene actividades asignadas."""
    conditions = _responsable_conditions(user.nombre)
    conditions.append(Hallazgo.id.in_(_actividad_ids_para(user.nombre)))
    return Hallazgo.query.filter(db.or_(*conditions))


def gestor_query(user):
    conditions = []
    if user.vicepresidencia:
        conditions.append(Hallazgo.vicepresidencia.ilike(f"%{user.vicepresidencia}%"))
    if user.dependencia:
        conditions.append(Hallazgo.dependencia_reporta_ero.ilike(f"%{user.dependencia}%"))
    conditions.extend(_responsable_conditions(user.nombre))
    conditions.append(Hallazgo.id.in_(_actividad_ids_para(user.nombre)))
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
    area = Hallazgo.direccion.label("area")
    return (
        db.session.query(area, func.count(Hallazgo.id).label("total"))
        .filter(Hallazgo.direccion.isnot(None))
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
    dialect = db.engine.dialect.name
    if dialect == "sqlite":
        mes_expr = func.strftime("%Y-%m-01", Hallazgo.fecha_inicial_evento).label("mes")
    else:
        mes_expr = func.date_trunc("month", Hallazgo.fecha_inicial_evento).label("mes")
    return (
        db.session.query(mes_expr, func.count(Hallazgo.id).label("total"))
        .filter(Hallazgo.fecha_inicial_evento >= desde)
        .filter(Hallazgo.id.in_(hallazgo_ids))
        .group_by(mes_expr)
        .order_by(mes_expr)
        .all()
    )
