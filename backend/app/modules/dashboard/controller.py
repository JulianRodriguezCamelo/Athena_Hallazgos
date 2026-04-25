from datetime import datetime, timedelta, timezone
from app.extensions import db
from app.models.hallazgo import Hallazgo
from app.models.actividad import Actividad
from app.models.upload_history import UploadHistory
from app.modules.dashboard import service


def get_metrics(user):
    q = service.base_query(user)
    now = datetime.now(timezone.utc)

    total = q.count()
    hallazgo_ids = [h.id for h in q.with_entities(Hallazgo.id)]
    total_actividades = (
        Actividad.query.filter(Actividad.hallazgo_id.in_(hallazgo_ids)).count()
        if hallazgo_ids else 0
    )
    abiertas = q.filter(
        db.or_(Hallazgo.estado.ilike("%abierto%"), Hallazgo.estado.ilike("%abierta%"))
    ).count()
    cerradas = q.filter(
        db.or_(Hallazgo.estado.ilike("%cerrado%"), Hallazgo.estado.ilike("%cerrada%"))
    ).count()
    cerradas_hoy = q.filter(
        db.func.date(Hallazgo.fecha_cierre_proyectada) == now.date()
    ).count()
    con_prorroga = q.filter(Hallazgo.prorroga.isnot(None), Hallazgo.prorroga != "").count()
    vencidos = q.filter(
        Hallazgo.fecha_cierre_proyectada < now,
        ~Hallazgo.estado.ilike("%cerrado%"),
        ~Hallazgo.estado.ilike("%cerrada%"),
    ).count()

    return {
        "total_hallazgos": total,
        "total_actividades": total_actividades,
        "abiertas": abiertas,
        "cerradas": cerradas,
        "cerradas_hoy": cerradas_hoy,
        "con_prorroga": con_prorroga,
        "vencidos": vencidos,
    }


def get_por_estado(user):
    ids = service.base_query(user).with_entities(Hallazgo.id)
    results = service.count_por_estado(ids)
    return [{"estado": r.estado, "total": r.total} for r in results]


def get_por_dependencia(user):
    ids = service.base_query(user).with_entities(Hallazgo.id)
    results = service.count_por_dependencia(ids)
    return [{"dependencia": r.area, "total": r.total} for r in results]


def get_por_responsable(user):
    ids = service.base_query(user).with_entities(Hallazgo.id)
    results = service.count_por_responsable(ids)
    return [{"responsable": r.responsable, "total": r.total} for r in results]


def get_por_estado_plan(user):
    ids = service.base_query(user).with_entities(Hallazgo.id)
    results = service.count_por_estado_plan(ids)
    return [{"estado_plan": r.estado_plan_accion, "total": r.total} for r in results]


def get_timeline(user):
    hace_12_meses = datetime.now(timezone.utc) - timedelta(days=365)
    ids = service.base_query(user).with_entities(Hallazgo.id)
    results = service.timeline_por_mes(ids, hace_12_meses)
    return [
        {"mes": r.mes.strftime("%Y-%m") if r.mes else None, "total": r.total}
        for r in results if r.mes
    ]


def get_prorrogas(user):
    q = service.base_query(user)
    now = datetime.now(timezone.utc)
    total_prorrogas = q.filter(Hallazgo.prorroga.isnot(None), Hallazgo.prorroga != "").count()
    vencidas = q.filter(
        Hallazgo.fecha_cierre_final_prorroga < now,
        ~Hallazgo.estado.ilike("%cerrado%"),
        ~Hallazgo.estado.ilike("%cerrada%"),
    ).count()
    return {"total_prorrogas": total_prorrogas, "prorrogas_vencidas": vencidas}


def get_uploads_recientes(user):
    query = UploadHistory.query
    if user.rol == "directivo":
        query = query.filter_by(uploaded_by_id=user.id)
    return query.order_by(UploadHistory.uploaded_at.desc()).limit(5).all()


# ─── Directivo ─────────────────────────────────────────────────────────────────

def directivo_mis_metricas(user):
    q = service.base_query(user)
    now = datetime.now(timezone.utc)
    hallazgo_ids = q.with_entities(Hallazgo.id)

    return {
        "total": q.count(),
        "abiertas": q.filter(
            db.or_(Hallazgo.estado.ilike("%abierto%"), Hallazgo.estado.ilike("%abierta%"))
        ).count(),
        "cerradas": q.filter(
            db.or_(Hallazgo.estado.ilike("%cerrado%"), Hallazgo.estado.ilike("%cerrada%"))
        ).count(),
        "vencidos": q.filter(
            Hallazgo.fecha_cierre_proyectada < now,
            ~Hallazgo.estado.ilike("%cerrado%"),
            ~Hallazgo.estado.ilike("%cerrada%"),
        ).count(),
        "con_prorroga": q.filter(Hallazgo.prorroga.isnot(None), Hallazgo.prorroga != "").count(),
        "mis_actividades": Actividad.query.filter(
            Actividad.hallazgo_id.in_(hallazgo_ids)
        ).count(),
    }


def directivo_mis_hallazgos(user, page, per_page):
    q = service.base_query(user).order_by(Hallazgo.fecha_cierre_proyectada.asc())
    return q.paginate(page=page, per_page=per_page, error_out=False)


def directivo_mis_actividades(user, page, per_page):
    hallazgo_ids = service.base_query(user).with_entities(Hallazgo.id)
    q = Actividad.query.filter(Actividad.hallazgo_id.in_(hallazgo_ids)).order_by(
        Actividad.fecha_compromiso.asc()
    )
    return q.paginate(page=page, per_page=per_page, error_out=False)


def directivo_menciones(user, page, per_page):
    nombre = user.nombre
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
    return q.paginate(page=page, per_page=per_page, error_out=False)


def directivo_por_estado_accion(user):
    hallazgo_ids = service.base_query(user).with_entities(Hallazgo.id)
    results = service.count_por_estado_accion(hallazgo_ids)
    return [{"estado": r.estado_accion, "total": r.total} for r in results]


# ─── Gestor ────────────────────────────────────────────────────────────────────

def _enrich_hallazgo(h, now):
    if h.fecha_cierre_proyectada:
        fcp = h.fecha_cierre_proyectada
        if fcp.tzinfo is None:
            fcp = fcp.replace(tzinfo=timezone.utc)
        dias_restantes = (fcp - now).days
    else:
        dias_restantes = 999

    if dias_restantes < 0:
        prioridad = "alta"
    elif dias_restantes <= 7:
        prioridad = "media"
    else:
        prioridad = "baja"

    estado_lower = (h.estado or "").lower()
    if "cerrado" in estado_lower or "cerrada" in estado_lower:
        workflow_estado = "cerrado"
    elif "validaci" in estado_lower:
        workflow_estado = "en_validacion"
    elif "ejecuci" in estado_lower or "proceso" in estado_lower:
        workflow_estado = "en_ejecucion"
    elif "análisis" in estado_lower or "analisis" in estado_lower:
        workflow_estado = "en_analisis"
    else:
        workflow_estado = "abierto"

    d = h.to_dict()
    d["dias_restantes"] = dias_restantes
    d["sla_dias"] = 30
    d["prioridad"] = prioridad
    d["workflow_estado"] = workflow_estado
    return d


def gestor_mis_metricas(user):
    q = service.gestor_query(user)
    now = datetime.now(timezone.utc)
    proximos_limite = now + timedelta(days=7)
    hallazgo_ids = q.with_entities(Hallazgo.id)

    no_cerrado = db.and_(
        ~Hallazgo.estado.ilike("%cerrado%"),
        ~Hallazgo.estado.ilike("%cerrada%"),
    )

    total = q.count()
    cerradas = q.filter(
        db.or_(Hallazgo.estado.ilike("%cerrado%"), Hallazgo.estado.ilike("%cerrada%"))
    ).count()
    abiertas = total - cerradas
    vencidos = q.filter(no_cerrado, Hallazgo.fecha_cierre_proyectada < now).count()
    proximos_vencer = q.filter(
        no_cerrado,
        Hallazgo.fecha_cierre_proyectada >= now,
        Hallazgo.fecha_cierre_proyectada <= proximos_limite,
    ).count()
    con_prorroga = q.filter(Hallazgo.prorroga.isnot(None), Hallazgo.prorroga != "").count()
    en_proceso = q.filter(
        no_cerrado,
        db.or_(
            Hallazgo.estado.ilike("%proceso%"),
            Hallazgo.estado.ilike("%ejecuci%"),
            Hallazgo.estado.ilike("%revisión%"),
            Hallazgo.estado.ilike("%revision%"),
        )
    ).count()
    pendientes_validacion = q.filter(Hallazgo.estado.ilike("%validaci%")).count()
    mis_actividades = Actividad.query.filter(Actividad.hallazgo_id.in_(hallazgo_ids)).count()

    # Actividades pendientes = sin estado completado/cerrado
    _completadas_filter = db.and_(
        ~Actividad.estado_accion.ilike("%completado%"),
        ~Actividad.estado_accion.ilike("%cerrado%"),
        ~Actividad.estado_accion.ilike("%cumplido%"),
        ~Actividad.estado_accion.ilike("%resuelto%"),
    )
    actividades_pendientes = Actividad.query.filter(
        Actividad.hallazgo_id.in_(hallazgo_ids),
        _completadas_filter,
    ).count()

    return {
        "total": total, "abiertas": abiertas, "cerradas": cerradas,
        "vencidos": vencidos, "proximos_vencer": proximos_vencer,
        "con_prorroga": con_prorroga, "en_proceso": en_proceso,
        "pendientes_validacion": pendientes_validacion,
        "mis_actividades": mis_actividades,
        "evidencias_pendientes": actividades_pendientes,
    }


def gestor_por_estado(user):
    ids = service.gestor_query(user).with_entities(Hallazgo.id)
    results = service.count_por_estado(ids)
    return [{"name": r.estado, "value": r.total} for r in results]


def gestor_por_estado_plan(user):
    ids = service.gestor_query(user).with_entities(Hallazgo.id)
    results = service.count_por_estado_plan(ids)
    return [{"name": r.estado_plan_accion, "value": r.total} for r in results]


def gestor_por_semaforo(user):
    q = service.gestor_query(user)
    now = datetime.now(timezone.utc)
    proximos_limite = now + timedelta(days=7)
    no_cerrado = db.and_(
        ~Hallazgo.estado.ilike("%cerrado%"),
        ~Hallazgo.estado.ilike("%cerrada%"),
    )
    en_tiempo = q.filter(
        no_cerrado,
        db.or_(
            Hallazgo.fecha_cierre_proyectada.is_(None),
            Hallazgo.fecha_cierre_proyectada > proximos_limite,
        ),
    ).count()
    proximo = q.filter(
        no_cerrado,
        Hallazgo.fecha_cierre_proyectada >= now,
        Hallazgo.fecha_cierre_proyectada <= proximos_limite,
    ).count()
    vencido = q.filter(no_cerrado, Hallazgo.fecha_cierre_proyectada < now).count()
    return [
        {"name": "En tiempo", "value": en_tiempo, "fill": "#22c55e"},
        {"name": "Próximo a vencer", "value": proximo, "fill": "#f59e0b"},
        {"name": "Vencido", "value": vencido, "fill": "#ef4444"},
    ]


def gestor_hallazgos(user, page, per_page):
    q = service.gestor_query(user).order_by(Hallazgo.fecha_cierre_proyectada.asc())
    pag = q.paginate(page=page, per_page=per_page, error_out=False)
    now = datetime.now(timezone.utc)
    return pag, now


def gestor_actividades(user, page, per_page):
    hallazgo_ids = service.gestor_query(user).with_entities(Hallazgo.id)
    q = Actividad.query.filter(Actividad.hallazgo_id.in_(hallazgo_ids)).order_by(
        Actividad.fecha_compromiso.asc()
    )
    return q.paginate(page=page, per_page=per_page, error_out=False)


def gestor_responsables_criticos(user):
    from collections import defaultdict
    q = service.gestor_query(user)
    now = datetime.now(timezone.utc)
    stats = defaultdict(lambda: {"vencidos": 0, "activos": 0, "cerrados": 0})

    for h in q.all():
        nombre = h.responsable_plan_accion or h.responsable_accion
        if not nombre:
            continue
        estado_lower = (h.estado or "").lower()
        is_closed = "cerrado" in estado_lower or "cerrada" in estado_lower
        if is_closed:
            stats[nombre]["cerrados"] += 1
        else:
            stats[nombre]["activos"] += 1
            fcp = h.fecha_cierre_proyectada
            if fcp:
                if fcp.tzinfo is None:
                    fcp = fcp.replace(tzinfo=timezone.utc)
                if fcp < now:
                    stats[nombre]["vencidos"] += 1

    result = []
    for nombre, s in stats.items():
        total = s["activos"] + s["cerrados"]
        cumplimiento = round((s["cerrados"] / total) * 100) if total > 0 else 0
        result.append({
            "nombre": nombre,
            "hallazgos_vencidos": s["vencidos"],
            "hallazgos_activos": s["activos"],
            "cumplimiento": cumplimiento,
        })
    result.sort(key=lambda x: (x["hallazgos_vencidos"], x["hallazgos_activos"]), reverse=True)
    return result[:5]


def gestor_enviar_recordatorios(gestor):
    from app.models.user import User
    from app.models.actividad import Actividad
    from app.modules.notifcations.service import NotificationService
    from app.modules.notifcations.email_template import build_recordatorio_html

    q = service.gestor_query(gestor)
    now = datetime.now(timezone.utc)
    responsables = gestor_responsables_criticos(gestor)
    resultados = []

    for resp in responsables:
        nombre = resp["nombre"]

        # Buscar usuario registrado por nombre
        usuario = User.query.filter(
            User.nombre.ilike(f"%{nombre}%"), User.activo == True
        ).first()

        # Hallazgos vencidos de este responsable
        hallazgos_vencidos = q.filter(
            db.or_(
                Hallazgo.responsable_plan_accion.ilike(f"%{nombre}%"),
                Hallazgo.responsable_accion.ilike(f"%{nombre}%"),
            ),
            Hallazgo.fecha_cierre_proyectada < now,
            ~Hallazgo.estado.ilike("%cerrad%"),
        ).all()

        # Actividades sin cerrar de este responsable
        hallazgo_ids = q.with_entities(Hallazgo.id)
        actividades_pendientes = Actividad.query.filter(
            Actividad.hallazgo_id.in_(hallazgo_ids),
            db.or_(
                Actividad.responsable_accion.ilike(f"%{nombre}%"),
                Actividad.responsable.ilike(f"%{nombre}%"),
            ),
            ~Actividad.estado_accion.ilike("%cerrad%"),
            ~Actividad.estado_accion.ilike("%completad%"),
            ~Actividad.estado_accion.ilike("%cumplid%"),
        ).all()

        hallazgos_data = [
            {
                "codigo": h.codigo_del_hallazgo or f"#{h.id}",
                "descripcion": h.descripcion or h.nombre_plan_accion or "",
                "fecha_vence": h.fecha_cierre_proyectada.strftime("%d %b %Y") if h.fecha_cierre_proyectada else "—",
            }
            for h in hallazgos_vencidos[:10]
        ]
        actividades_data = [
            {
                "descripcion": a.descripcion or "",
                "hallazgo_codigo": a.codigo_del_hallazgo or f"#{a.hallazgo_id}",
                "fecha_compromiso": a.fecha_compromiso.strftime("%d %b %Y") if a.fecha_compromiso else "—",
            }
            for a in actividades_pendientes[:10]
        ]

        nombre_encoded = nombre.replace(" ", "+")
        filtro_url = f"https://athena.fiduprevisora.com/dashboard/hallazgos?responsable={nombre_encoded}"

        # Notificación en sistema (a todos independientemente del rol)
        titulo_notif = f"Recordatorio de seguimiento — {len(hallazgos_vencidos)} hallazgos vencidos"
        msg_notif = f"Tienes {len(hallazgos_vencidos)} hallazgos vencidos y {len(actividades_pendientes)} actividades pendientes por gestionar."

        if usuario:
            try:
                NotificationService._guardar(
                    usuario.id, None, titulo_notif, msg_notif, "alerta"
                )
            except Exception:
                pass

            # Email al responsable
            try:
                html = build_recordatorio_html(
                    nombre_responsable=nombre,
                    hallazgos_data=hallazgos_data,
                    actividades_data=actividades_data,
                    gestor_nombre=gestor.nombre,
                    filtro_url=filtro_url,
                )
                NotificationService._send(
                    to=usuario.email,
                    subject=f"[RECORDATORIO] {len(hallazgos_vencidos)} hallazgos vencidos requieren tu atención — Athena",
                    html=html,
                    fallback=msg_notif,
                )
                email_enviado = True
            except Exception:
                email_enviado = False
        else:
            email_enviado = False

        resultados.append({
            "nombre": nombre,
            "usuario_encontrado": usuario is not None,
            "email_enviado": email_enviado,
            "hallazgos_vencidos": len(hallazgos_vencidos),
            "actividades_pendientes": len(actividades_pendientes),
        })

    return {"enviados": resultados}


def gestor_bitacora(user):
    q = service.gestor_query(user)
    recientes = q.order_by(Hallazgo.updated_at.desc()).limit(15).all()
    entries = []
    for h in recientes:
        if not h.updated_at:
            continue
        entries.append({
            "id": h.id,
            "fecha": h.updated_at.strftime("%Y-%m-%d %H:%M"),
            "usuario": h.responsable_plan_accion or h.responsable_accion or "Sistema",
            "accion": "Estado actualizado",
            "detalle": f"{h.codigo_del_hallazgo}: {h.estado or 'Sin estado'}",
        })
    return entries


def gestor_top_retrasados(user):
    q = service.gestor_query(user)
    now = datetime.now(timezone.utc)
    hallazgos = q.filter(
        Hallazgo.fecha_cierre_proyectada < now,
        ~Hallazgo.estado.ilike("%cerrado%"),
        ~Hallazgo.estado.ilike("%cerrada%"),
    ).order_by(Hallazgo.fecha_cierre_proyectada.asc()).limit(10).all()

    result = []
    for h in hallazgos:
        fcp = h.fecha_cierre_proyectada
        if fcp and fcp.tzinfo is None:
            fcp = fcp.replace(tzinfo=timezone.utc)
        dias_retraso = (now - fcp).days if fcp else 0

        act_pendientes = Actividad.query.filter(
            Actividad.hallazgo_id == h.id,
            ~Actividad.estado_accion.ilike("%completado%"),
            ~Actividad.estado_accion.ilike("%cerrado%"),
            ~Actividad.estado_accion.ilike("%cumplido%"),
            ~Actividad.estado_accion.ilike("%resuelto%"),
        ).count()

        result.append({
            "codigo": h.codigo_del_hallazgo or f"#{h.id}",
            "descripcion": (h.descripcion or "Sin descripción")[:55],
            "dias_retraso": dias_retraso,
            "actividades_pendientes": act_pendientes,
        })
    return result


def gestor_tiempo_promedio(user):
    from collections import defaultdict
    q = service.gestor_query(user)
    now = datetime.now(timezone.utc)
    hallazgos = q.filter(Hallazgo.fecha_inicial_evento.isnot(None)).all()
    buckets = defaultdict(list)

    for h in hallazgos:
        estado_lower = (h.estado or "").lower()
        inicio = h.fecha_inicial_evento
        if inicio.tzinfo is None:
            inicio = inicio.replace(tzinfo=timezone.utc)
        dias = (now - inicio).days
        if "análisis" in estado_lower or "analisis" in estado_lower or "abierto" in estado_lower or "pendiente" in estado_lower:
            buckets["Análisis"].append(dias)
        elif "ejecuci" in estado_lower or "proceso" in estado_lower:
            buckets["Ejecución"].append(dias)
        elif "validaci" in estado_lower:
            buckets["Validación"].append(dias)

    result = []
    for name in ["Análisis", "Ejecución", "Validación"]:
        values = buckets[name]
        avg = round(sum(values) / len(values), 1) if values else 0
        result.append({"name": name, "value": avg})
    return result
