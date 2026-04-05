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
        if user.vicepresidencia:
            return query.filter(Hallazgo.vicepresidencia == user.vicepresidencia)
        if user.dependencia:
            return query.filter(Hallazgo.dependencia_reporta_ero == user.dependencia)
        return query

    if user.rol == "gestor":
        return _gestor_query(user)

    return query.filter(db.false())


def _gestor_query(user):
    """Hallazgos accesibles para un Gestor de Hallazgos."""
    nombre = user.nombre
    conditions = []
    if user.dependencia:
        conditions.append(Hallazgo.dependencia_reporta_ero == user.dependencia)
    conditions.append(Hallazgo.responsable_plan_accion.ilike(f"%{nombre}%"))
    conditions.append(Hallazgo.responsable_accion.ilike(f"%{nombre}%"))
    return Hallazgo.query.filter(db.or_(*conditions))


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
    """Hallazgos del área del directivo (por vicepresidencia o dependencia)."""
    return _base_query(user)


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

    hallazgo_ids = q.with_entities(Hallazgo.id)
    mis_actividades = Actividad.query.filter(
        Actividad.hallazgo_id.in_(hallazgo_ids)
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
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    hallazgo_ids = _mis_hallazgos_q(user).with_entities(Hallazgo.id)
    q = Actividad.query.filter(
        Actividad.hallazgo_id.in_(hallazgo_ids)
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


# ─── Gestor de Hallazgos ───────────────────────────────────────────────────────

def _enrich_hallazgo(h, now):
    """Agrega campos calculados a un hallazgo para el panel del gestor."""
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


@dashboard_bp.route("/gestor/mis-metricas", methods=["GET"])
@jwt_required()
def gestor_mis_metricas():
    user = get_current_user()
    q = _gestor_query(user)
    now = datetime.now(timezone.utc)
    proximos_limite = now + timedelta(days=7)

    total = q.count()
    cerradas = q.filter(
        db.or_(
            Hallazgo.estado.ilike("%cerrado%"),
            Hallazgo.estado.ilike("%cerrada%"),
        )
    ).count()
    abiertas = total - cerradas
    vencidos = q.filter(
        Hallazgo.fecha_cierre_proyectada < now,
        ~Hallazgo.estado.ilike("%cerrado%"),
        ~Hallazgo.estado.ilike("%cerrada%"),
    ).count()
    proximos_vencer = q.filter(
        Hallazgo.fecha_cierre_proyectada >= now,
        Hallazgo.fecha_cierre_proyectada <= proximos_limite,
        ~Hallazgo.estado.ilike("%cerrado%"),
        ~Hallazgo.estado.ilike("%cerrada%"),
    ).count()
    con_prorroga = q.filter(
        Hallazgo.prorroga.isnot(None),
        Hallazgo.prorroga != "",
    ).count()
    en_proceso = q.filter(
        db.or_(
            Hallazgo.estado.ilike("%proceso%"),
            Hallazgo.estado.ilike("%ejecuci%"),
        )
    ).count()
    pendientes_validacion = q.filter(
        Hallazgo.estado.ilike("%validaci%")
    ).count()

    # Actividades en hallazgos del gestor
    hallazgo_ids = q.with_entities(Hallazgo.id)
    mis_actividades = Actividad.query.filter(
        Actividad.hallazgo_id.in_(hallazgo_ids)
    ).count()
    evidencias_pendientes = Actividad.query.filter(
        Actividad.hallazgo_id.in_(hallazgo_ids),
        db.or_(
            Actividad.observaciones.is_(None),
            Actividad.observaciones == "",
        ),
        ~Actividad.estado_accion.ilike("%completado%"),
        ~Actividad.estado_accion.ilike("%cerrado%"),
        ~Actividad.estado_accion.ilike("%cumplido%"),
    ).count()

    return jsonify({
        "total": total,
        "abiertas": abiertas,
        "cerradas": cerradas,
        "vencidos": vencidos,
        "proximos_vencer": proximos_vencer,
        "con_prorroga": con_prorroga,
        "en_proceso": en_proceso,
        "pendientes_validacion": pendientes_validacion,
        "mis_actividades": mis_actividades,
        "evidencias_pendientes": evidencias_pendientes,
    }), 200


@dashboard_bp.route("/gestor/por-estado", methods=["GET"])
@jwt_required()
def gestor_por_estado():
    user = get_current_user()
    q = _gestor_query(user)

    results = (
        db.session.query(Hallazgo.estado, func.count(Hallazgo.id).label("total"))
        .filter(Hallazgo.estado.isnot(None))
        .filter(Hallazgo.id.in_(q.with_entities(Hallazgo.id)))
        .group_by(Hallazgo.estado)
        .order_by(func.count(Hallazgo.id).desc())
        .all()
    )
    return jsonify({
        "data": [{"name": r.estado, "value": r.total} for r in results]
    }), 200


@dashboard_bp.route("/gestor/por-estado-plan", methods=["GET"])
@jwt_required()
def gestor_por_estado_plan():
    user = get_current_user()
    q = _gestor_query(user)

    results = (
        db.session.query(Hallazgo.estado_plan_accion, func.count(Hallazgo.id).label("total"))
        .filter(Hallazgo.estado_plan_accion.isnot(None))
        .filter(Hallazgo.id.in_(q.with_entities(Hallazgo.id)))
        .group_by(Hallazgo.estado_plan_accion)
        .order_by(func.count(Hallazgo.id).desc())
        .all()
    )
    return jsonify({
        "data": [{"name": r.estado_plan_accion, "value": r.total} for r in results]
    }), 200


@dashboard_bp.route("/gestor/por-semaforo", methods=["GET"])
@jwt_required()
def gestor_por_semaforo():
    user = get_current_user()
    q = _gestor_query(user)
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
    vencido = q.filter(
        no_cerrado,
        Hallazgo.fecha_cierre_proyectada < now,
    ).count()

    return jsonify({
        "data": [
            {"name": "En tiempo", "value": en_tiempo, "fill": "#22c55e"},
            {"name": "Próximo a vencer", "value": proximo, "fill": "#f59e0b"},
            {"name": "Vencido", "value": vencido, "fill": "#ef4444"},
        ]
    }), 200


@dashboard_bp.route("/gestor/hallazgos", methods=["GET"])
@jwt_required()
def gestor_hallazgos():
    user = get_current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)

    q = _gestor_query(user).order_by(Hallazgo.fecha_cierre_proyectada.asc())
    pag = q.paginate(page=page, per_page=per_page, error_out=False)

    now = datetime.now(timezone.utc)
    return jsonify({
        "hallazgos": [_enrich_hallazgo(h, now) for h in pag.items],
        "total": pag.total,
        "page": page,
        "pages": pag.pages,
    }), 200


@dashboard_bp.route("/gestor/actividades", methods=["GET"])
@jwt_required()
def gestor_actividades():
    user = get_current_user()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 100, type=int)

    hallazgo_ids = _gestor_query(user).with_entities(Hallazgo.id)
    q = (
        Actividad.query
        .filter(Actividad.hallazgo_id.in_(hallazgo_ids))
        .order_by(Actividad.fecha_compromiso.asc())
    )
    pag = q.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "actividades": [a.to_dict() for a in pag.items],
        "total": pag.total,
        "page": page,
        "pages": pag.pages,
    }), 200


@dashboard_bp.route("/gestor/responsables-criticos", methods=["GET"])
@jwt_required()
def gestor_responsables_criticos():
    user = get_current_user()
    q = _gestor_query(user)
    now = datetime.now(timezone.utc)

    from collections import defaultdict
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
    return jsonify({"data": result[:5]}), 200


@dashboard_bp.route("/gestor/bitacora", methods=["GET"])
@jwt_required()
def gestor_bitacora():
    """Genera una bitácora de actividad a partir de hallazgos actualizados recientemente."""
    user = get_current_user()
    q = _gestor_query(user)

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

    return jsonify({"entries": entries}), 200


@dashboard_bp.route("/gestor/tiempo-promedio", methods=["GET"])
@jwt_required()
def gestor_tiempo_promedio():
    """Días promedio que llevan los hallazgos abiertos en cada etapa del workflow."""
    user = get_current_user()
    q = _gestor_query(user)
    now = datetime.now(timezone.utc)

    hallazgos = q.filter(Hallazgo.fecha_inicial_evento.isnot(None)).all()

    from collections import defaultdict
    buckets = defaultdict(list)

    for h in hallazgos:
        estado_lower = (h.estado or "").lower()
        inicio = h.fecha_inicial_evento
        if inicio.tzinfo is None:
            inicio = inicio.replace(tzinfo=timezone.utc)
        dias = (now - inicio).days

        if "análisis" in estado_lower or "analisis" in estado_lower or "abierto" in estado_lower:
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

    return jsonify({"data": result}), 200
