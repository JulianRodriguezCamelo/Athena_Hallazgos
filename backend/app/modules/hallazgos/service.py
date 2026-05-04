from app.extensions import db
from app.models.hallazgo import Hallazgo
from app.models.actividad import Actividad
from app.modules.dashboard.service import profesional_query, gestor_query


def apply_role_filter(query, user):
    if user.rol in ("vicepresidente", "administrador"):
        return query
    if user.rol in ("directivo", "profesional"):
        return profesional_query(user)
    if user.rol == "gestor":
        return gestor_query(user)
    return query.filter(db.false())


def base_query(user):
    return apply_role_filter(Hallazgo.query, user)


def get_by_id(user, hallazgo_id: int):
    return base_query(user).filter_by(id=hallazgo_id).first()


def update(hallazgo, data: dict, campos_editables: list):
    for campo in campos_editables:
        if campo in data:
            setattr(hallazgo, campo, data[campo])
    db.session.commit()
    
    return hallazgo


def get_actividades(hallazgo_id: int):
    return Actividad.query.filter_by(hallazgo_id=hallazgo_id).all()


def query_actividades(accessible_ids):
    return Actividad.query.filter(Actividad.hallazgo_id.in_(accessible_ids))


def distinct_estados(hallazgo_ids):
    return db.session.query(Hallazgo.estado).filter(
        Hallazgo.estado.isnot(None),
        Hallazgo.id.in_(hallazgo_ids),
    ).distinct().all()


def distinct_dependencias(hallazgo_ids):
    return db.session.query(Hallazgo.dependencia_reporta_ero).filter(
        Hallazgo.dependencia_reporta_ero.isnot(None),
        Hallazgo.id.in_(hallazgo_ids),
    ).distinct().all()


def distinct_vicepresidencias():
    return db.session.query(Hallazgo.vicepresidencia).filter(
        Hallazgo.vicepresidencia.isnot(None),
    ).distinct().order_by(Hallazgo.vicepresidencia).all()


def distinct_direcciones(hallazgo_ids):
    return db.session.query(Hallazgo.direccion).filter(
        Hallazgo.direccion.isnot(None),
        Hallazgo.id.in_(hallazgo_ids),
    ).distinct().order_by(Hallazgo.direccion).all()


def distinct_responsables(hallazgo_ids):
    from_hallazgos = db.session.query(Hallazgo.responsable_plan_accion).filter(
        Hallazgo.responsable_plan_accion.isnot(None),
        Hallazgo.id.in_(hallazgo_ids),
    ).distinct()
    from_actividades = db.session.query(Actividad.responsable).filter(
        Actividad.responsable.isnot(None),
        Actividad.hallazgo_id.in_(hallazgo_ids),
    ).distinct()
    return from_hallazgos, from_actividades


def distinct_estados_plan(hallazgo_ids):
    return db.session.query(Hallazgo.estado_plan_accion).filter(
        Hallazgo.estado_plan_accion.isnot(None),
        Hallazgo.id.in_(hallazgo_ids),
    ).distinct().order_by(Hallazgo.estado_plan_accion).all()
