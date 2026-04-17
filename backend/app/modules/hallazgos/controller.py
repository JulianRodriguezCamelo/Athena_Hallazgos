from sqlalchemy import nullslast, case
from datetime import datetime, timezone
from app.extensions import db
from app.models.hallazgo import Hallazgo
from app.models.actividad import Actividad
from app.modules.hallazgos import service

CAMPOS_EDITABLES = [
    "estado", "observaciones", "estado_plan_accion",
    "responsable_plan_accion", "estado_accion", "responsable_accion",
    "prorroga", "fecha_cierre_final_prorroga", "fecha_cierre_proyectada",
]


def list_hallazgos(user, filters: dict, page: int, per_page: int):
    query = service.base_query(user)

    estado = filters.get("estado")
    dependencia = filters.get("dependencia")
    vicepresidencia = filters.get("vicepresidencia")
    direccion = filters.get("direccion")
    responsable = filters.get("responsable")
    estado_plan = filters.get("estado_plan_accion")
    search = filters.get("search")
    vencido = filters.get("vencido")
    con_prorroga = filters.get("con_prorroga")
    fecha_cierre_desde = filters.get("fecha_cierre_desde")
    fecha_cierre_hasta = filters.get("fecha_cierre_hasta")
    fecha_inicial_desde = filters.get("fecha_inicial_desde")
    fecha_inicial_hasta = filters.get("fecha_inicial_hasta")

    if estado:
        query = query.filter(Hallazgo.estado.ilike(f"%{estado}%"))
    if dependencia and user.rol == "vicepresidente":
        query = query.filter(Hallazgo.dependencia_reporta_ero.ilike(f"%{dependencia}%"))
    if vicepresidencia and user.rol == "vicepresidente":
        query = query.filter(Hallazgo.vicepresidencia.ilike(f"%{vicepresidencia}%"))
    if direccion:
        query = query.filter(Hallazgo.direccion.ilike(f"%{direccion}%"))
    if responsable:
        actividad_subq = db.session.query(Actividad.hallazgo_id).filter(
            db.or_(
                Actividad.responsable.ilike(f"%{responsable}%"),
                Actividad.responsable_accion.ilike(f"%{responsable}%"),
            )
        ).subquery()
        query = query.filter(
            db.or_(
                Hallazgo.responsable_plan_accion.ilike(f"%{responsable}%"),
                Hallazgo.responsable_accion.ilike(f"%{responsable}%"),
                Hallazgo.id.in_(actividad_subq),
            )
        )
    if estado_plan:
        query = query.filter(Hallazgo.estado_plan_accion.ilike(f"%{estado_plan}%"))
    if search:
        query = query.filter(
            db.or_(
                Hallazgo.codigo_del_hallazgo.ilike(f"%{search}%"),
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
    if fecha_inicial_desde:
        try:
            dt = datetime.strptime(fecha_inicial_desde, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            query = query.filter(Hallazgo.fecha_inicial_evento >= dt)
        except ValueError:
            pass
    if fecha_inicial_hasta:
        try:
            dt = datetime.strptime(fecha_inicial_hasta, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            query = query.filter(Hallazgo.fecha_inicial_evento <= dt)
        except ValueError:
            pass

    query = query.order_by(
        case((Hallazgo.codigo_del_hallazgo.isnot(None), 0), else_=1),
        nullslast(Hallazgo.fecha_inicial_evento.desc()),
    )
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    def serialize(h):
        d = h.to_dict()
        if responsable:
            es_directo = (
                (h.responsable_plan_accion and responsable.lower() in h.responsable_plan_accion.lower()) or
                (h.responsable_accion and responsable.lower() in h.responsable_accion.lower())
            )
            d["vinculado_via_actividad"] = not es_directo
        else:
            d["vinculado_via_actividad"] = False
        return d

    return {
        "hallazgos": [serialize(h) for h in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": paginated.page,
        "per_page": paginated.per_page,
    }


def get_hallazgo(user, hallazgo_id: int):
    return service.get_by_id(user, hallazgo_id)


def update_hallazgo(user, hallazgo_id: int, data: dict):
    hallazgo = service.get_by_id(user, hallazgo_id)
    if not hallazgo:
        return None
    return service.update(hallazgo, data, CAMPOS_EDITABLES)


def get_actividades(user, hallazgo_id: int):
    hallazgo = service.get_by_id(user, hallazgo_id)
    if not hallazgo:
        return None
    return service.get_actividades(hallazgo_id)


def list_actividades(user, filters: dict, page: int, per_page: int):
    accessible_ids = service.base_query(user).with_entities(Hallazgo.id)
    query = service.query_actividades(accessible_ids)

    search = filters.get("search")
    responsable = filters.get("responsable")
    estado_plan = filters.get("estado_plan_accion")
    estado_accion = filters.get("estado_accion")
    vencido = filters.get("vencido")
    con_prorroga = filters.get("con_prorroga")

    if search:
        query = query.filter(
            db.or_(
                Actividad.nombre_plan_accion.ilike(f"%{search}%"),
                Actividad.descripcion.ilike(f"%{search}%"),
                Actividad.codigo_del_hallazgo.ilike(f"%{search}%"),
            )
        )
    if responsable:
        query = query.filter(
            db.or_(
                Actividad.responsable.ilike(f"%{responsable}%"),
                Actividad.responsable_accion.ilike(f"%{responsable}%"),
            )
        )
    if estado_plan:
        query = query.filter(Actividad.estado_plan_accion.ilike(f"%{estado_plan}%"))
    if estado_accion:
        query = query.filter(Actividad.estado_accion.ilike(f"%{estado_accion}%"))
    if vencido == "true":
        query = query.filter(
            Actividad.fecha_compromiso < datetime.now(timezone.utc),
            ~Actividad.estado_accion.ilike("%cerrado%"),
        )
    if con_prorroga == "true":
        query = query.filter(
            Actividad.prorroga.isnot(None),
            Actividad.prorroga != "",
        )

    query = query.order_by(Actividad.hallazgo_id, Actividad.orden)
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return {
        "actividades": [a.to_dict() for a in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": paginated.page,
        "per_page": paginated.per_page,
    }


def get_estados(user):
    ids = service.base_query(user).with_entities(Hallazgo.id)
    return [e[0] for e in service.distinct_estados(ids) if e[0]]


def get_dependencias(user):
    ids = service.base_query(user).with_entities(Hallazgo.id)
    return [d[0] for d in service.distinct_dependencias(ids) if d[0]]


def get_vicepresidencias():
    return [v[0] for v in service.distinct_vicepresidencias() if v[0]]


def get_direcciones(user):
    ids = service.base_query(user).with_entities(Hallazgo.id)
    return [d[0] for d in service.distinct_direcciones(ids) if d[0]]


def get_responsables(user):
    ids = service.base_query(user).with_entities(Hallazgo.id)
    from_h, from_a = service.distinct_responsables(ids)
    nombres: set[str] = set()
    for (r,) in from_h:
        if r:
            nombres.add(r)
    for (r,) in from_a:
        if r:
            nombres.add(r)
    return sorted(nombres)


def get_estados_plan(user):
    ids = service.base_query(user).with_entities(Hallazgo.id)
    return [e[0] for e in service.distinct_estados_plan(ids) if e[0]]
