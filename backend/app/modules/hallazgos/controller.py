import logging
from sqlalchemy import nullslast, case
from datetime import datetime, timezone
from app.extensions import db
from app.models.hallazgo import Hallazgo
from app.models.actividad import Actividad
from app.modules.hallazgos import service

logger = logging.getLogger(__name__)

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

    prev_responsable_plan = hallazgo.responsable_plan_accion
    prev_responsable_accion = hallazgo.responsable_accion
    prev_estado = hallazgo.estado
    prev_prorroga = hallazgo.prorroga

    updated = service.update(hallazgo, data, CAMPOS_EDITABLES)

    try:
        from app.modules.notifcations.service import NotificationService
        nuevo_rp = data.get("responsable_plan_accion")
        if nuevo_rp and nuevo_rp != prev_responsable_plan:
            NotificationService.notificar_asignacion(updated, "responsable_plan_accion", nuevo_rp, user)
        nuevo_ra = data.get("responsable_accion")
        if nuevo_ra and nuevo_ra != prev_responsable_accion:
            NotificationService.notificar_asignacion(updated, "responsable_accion", nuevo_ra, user)
        nuevo_estado = data.get("estado")
        if nuevo_estado and nuevo_estado != prev_estado:
            NotificationService.notificar_actualizacion_estado(updated, prev_estado or "—", nuevo_estado, user)
        nueva_prorroga = data.get("prorroga")
        if nueva_prorroga and nueva_prorroga != prev_prorroga:
            NotificationService.notificar_prorroga(updated, nueva_prorroga, user)
    except Exception as e:
        logger.error("Error enviando notificación en update_hallazgo (id=%s): %s", hallazgo_id, e)

    return updated


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


def _is_completada(estado: str | None) -> bool:
    if not estado:
        return False
    lower = estado.lower()
    return any(k in lower for k in ("cerrado", "completado", "cumplido"))


def update_actividad_estado(user, actividad_id: int, estado: str):
    actividad = Actividad.query.get(actividad_id)
    if not actividad:
        return None
    if not service.get_by_id(user, actividad.hallazgo_id):
        return None

    prev_estado = actividad.estado_accion
    actividad.estado_accion = estado
    db.session.commit()

    try:
        from app.modules.notifcations.service import NotificationService
        if estado != prev_estado and actividad.hallazgo:
            NotificationService.notificar_actualizacion_estado(
                actividad.hallazgo, prev_estado or "—", estado, user)
    except Exception as e:
        logger.error("Error enviando notificación en update_actividad_estado (id=%s): %s", actividad_id, e)

    return actividad



def get_checklist(user, page: int, per_page: int):
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)

    query = service.base_query(user).order_by(
        nullslast(Hallazgo.fecha_cierre_proyectada.asc())
    )
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    hallazgo_ids = [h.id for h in paginated.items]
    all_acts = (
        Actividad.query
        .filter(Actividad.hallazgo_id.in_(hallazgo_ids))
        .order_by(Actividad.orden)
        .all()
    ) if hallazgo_ids else []

    acts_map: dict[int, list] = {}
    seen_acts: dict[int, set] = {}
    for a in all_acts:
        key = (a.descripcion, str(a.fecha_compromiso))
        if key not in seen_acts.setdefault(a.hallazgo_id, set()):
            seen_acts[a.hallazgo_id].add(key)
            acts_map.setdefault(a.hallazgo_id, []).append(a)

    result = []
    for h in paginated.items:
        actividades = acts_map.get(h.id, [])
        total = len(actividades)
        completadas = sum(1 for a in actividades if _is_completada(a.estado_accion))

        fcp = h.fecha_cierre_proyectada
        if fcp:
            if fcp.tzinfo is None:
                fcp = fcp.replace(tzinfo=timezone.utc)
            dias_restantes = (fcp - now).days
        else:
            dias_restantes = None

        d = h.to_dict()
        d["actividades"] = [a.to_dict() for a in actividades]
        d["total_actividades"] = total
        d["actividades_completadas"] = completadas
        d["progreso"] = round((completadas / total) * 100) if total > 0 else 0
        d["dias_restantes"] = dias_restantes
        result.append(d)

    return {
        "hallazgos": result,
        "total": paginated.total,
        "pages": paginated.pages,
        "page": paginated.page,
    }


def list_notas_actividad(user, actividad_id: int):
    actividad = Actividad.query.get(actividad_id)
    if not actividad:
        return None
    if not service.get_by_id(user, actividad.hallazgo_id):
        return None
    from app.models.nota_seguimiento import NotaSeguimiento
    notas = (
        NotaSeguimiento.query
        .filter_by(actividad_id=actividad_id)
        .order_by(NotaSeguimiento.created_at.desc())
        .all()
    )
    return notas


def add_nota_actividad(user, actividad_id: int, texto: str):
    from datetime import datetime, timezone
    actividad = Actividad.query.get(actividad_id)
    if not actividad:
        return None, "Actividad no encontrada"
    if not service.get_by_id(user, actividad.hallazgo_id):
        return None, "Sin permisos"
    if not texto or not texto.strip():
        return None, "La nota no puede estar vacía"

    from app.models.nota_seguimiento import NotaSeguimiento
    ahora = datetime.now(timezone.utc)
    nota = NotaSeguimiento(
        actividad_id=actividad_id,
        user_id=user.id,
        nota=texto.strip(),
        created_at=ahora,
    )
    actividad.ultima_nota_at = ahora
    db.session.add(nota)
    db.session.commit()

    try:
        from app.modules.notifcations.service import NotificationService
        hallazgo = actividad.hallazgo
        if hallazgo:
            title = f"Nueva nota — {hallazgo.codigo_del_hallazgo or f'#{hallazgo.id}'}"
            message = (
                f"{user.nombre} agregó una nota en '{actividad.descripcion[:80]}': "
                f"{texto.strip()[:120]}"
            )
            for u in NotificationService._usuarios_a_notificar_hallazgo(hallazgo):
                if u.id != user.id:
                    NotificationService._guardar(u.id, hallazgo.id, title, message, "nota", email_sent=False)
    except Exception as e:
        logger.error("Error enviando notificación en add_nota_actividad (actividad_id=%s): %s", actividad_id, e)

    return nota, None


def list_checklist_items(user, actividad_id: int):
    actividad = Actividad.query.get(actividad_id)
    if not actividad:
        return None, "Actividad no encontrada"
    if not service.get_by_id(user, actividad.hallazgo_id):
        return None, "Sin permisos"
    from app.models.checklist_item import ChecklistItem
    items = (
        ChecklistItem.query
        .filter_by(actividad_id=actividad_id)
        .order_by(ChecklistItem.created_at.asc())
        .all()
    )
    return items, None


def create_checklist_item(user, actividad_id: int, descripcion: str):
    actividad = Actividad.query.get(actividad_id)
    if not actividad:
        return None, "Actividad no encontrada"
    if not service.get_by_id(user, actividad.hallazgo_id):
        return None, "Sin permisos"
    if user.rol == "vicepresidente":
        return None, "Sin permisos para crear ítems"
    if not descripcion or not descripcion.strip():
        return None, "La descripción no puede estar vacía"
    from app.models.checklist_item import ChecklistItem
    item = ChecklistItem(
        actividad_id=actividad_id,
        descripcion=descripcion.strip(),
    )
    db.session.add(item)
    db.session.commit()
    return item, None


def complete_checklist_item(user, item_id: int, link_evidencia: str | None):
    from app.models.checklist_item import ChecklistItem
    item = ChecklistItem.query.get(item_id)
    if not item:
        return None, "Ítem no encontrado"
    actividad = Actividad.query.get(item.actividad_id)
    if not actividad or not service.get_by_id(user, actividad.hallazgo_id):
        return None, "Sin permisos"
    if user.rol == "vicepresidente":
        return None, "Sin permisos para completar ítems"
    item.completado = True
    item.fecha_completado = datetime.now(timezone.utc)
    item.completado_por_id = user.id
    if link_evidencia is not None:
        item.link_evidencia = link_evidencia.strip() or None
    db.session.commit()

    try:
        from app.modules.notifcations.service import NotificationService
        hallazgo = actividad.hallazgo
        if hallazgo:
            title = f"Evidencia registrada — {hallazgo.codigo_del_hallazgo or f'#{hallazgo.id}'}"
            message = (
                f"{user.nombre} completó el ítem '{item.descripcion[:80]}' "
                f"en la actividad '{actividad.descripcion[:60]}'."
                + (f" Evidencia: {item.link_evidencia}" if item.link_evidencia else "")
            )
            for u in NotificationService._usuarios_a_notificar_hallazgo(hallazgo):
                if u.id != user.id:
                    NotificationService._guardar(u.id, hallazgo.id, title, message, "evidencia", email_sent=False)
    except Exception as e:
        logger.error("Error enviando notificación en complete_checklist_item (item_id=%s): %s", item_id, e)

    return item, None


def reopen_checklist_item(user, item_id: int):
    from app.models.checklist_item import ChecklistItem
    item = ChecklistItem.query.get(item_id)
    if not item:
        return None, "Ítem no encontrado"
    actividad = Actividad.query.get(item.actividad_id)
    if not actividad or not service.get_by_id(user, actividad.hallazgo_id):
        return None, "Sin permisos"
    if user.rol == "vicepresidente":
        return None, "Sin permisos para reabrir ítems"
    item.completado = False
    item.fecha_completado = None
    item.completado_por_id = None
    db.session.commit()
    return item, None


def delete_checklist_item(user, item_id: int):
    from app.models.checklist_item import ChecklistItem
    item = ChecklistItem.query.get(item_id)
    if not item:
        return False, "Ítem no encontrado"
    actividad = Actividad.query.get(item.actividad_id)
    if not actividad or not service.get_by_id(user, actividad.hallazgo_id):
        return False, "Sin permisos"
    if user.rol == "vicepresidente":
        return False, "Sin permisos para eliminar ítems"
    db.session.delete(item)
    db.session.commit()
    return True, None


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
