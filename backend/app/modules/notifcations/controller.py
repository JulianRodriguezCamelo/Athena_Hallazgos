from app.modules.notifcations.service import NotificationService


def get_notificaciones(user):
    return NotificationService.obtener_notificaciones(user.id)


def crear_notificacion(user, data):
    return NotificationService.notify(
        user=user,
        hallazgo_id=data["hallazgo_id"],
        title=data["title"],
        message=data["message"],
        type=data["type"],
        send_email=data.get("send_email", True),
        prioridad=data.get("prioridad"),
        area=data.get("area"),
    )


def alertar_vencimiento(gestor, data):
    from app.models.hallazgo import Hallazgo
    from app.models.actividad import Actividad

    tipo = data.get("tipo")
    entity_id = data.get("entity_id")

    if tipo == "hallazgo":
        hallazgo = Hallazgo.query.get_or_404(entity_id)
        count = NotificationService.alerta_vencimiento_hallazgo(gestor, hallazgo)
        return {"notificados": count, "tipo": "hallazgo", "id": entity_id}

    if tipo == "actividad":
        actividad = Actividad.query.get_or_404(entity_id)
        count = NotificationService.alerta_vencimiento_actividad(gestor, actividad)
        return {"notificados": count, "tipo": "actividad", "id": entity_id}

    return None, "El campo 'tipo' debe ser 'hallazgo' o 'actividad'"


def mark_as_read(user, notif_id: int):
    from app.models.notificacitions import Notificacition
    from app.extensions import db
    notif = Notificacition.query.filter_by(id=notif_id, user_id=user.id).first()
    if not notif:
        return None
    notif.read = True
    db.session.commit()
    return notif


def mark_all_as_read(user):
    from app.models.notificacitions import Notificacition
    from app.extensions import db
    count = Notificacition.query.filter_by(user_id=user.id, read=False).update({"read": True})
    db.session.commit()
    return count


def enviar_personalizada(gestor, data):
    nombre = data.get("nombre", "").strip()
    correo = data.get("correo", "").strip()
    direccion = data.get("direccion", "").strip()
    hallazgo = data.get("hallazgo", "").strip()
    estado_notas = data.get("estado_notas", "").strip()

    if not nombre or not correo:
        return None, "Los campos 'nombre' y 'correo' son obligatorios"

    NotificationService.enviar_notificacion_personalizada(
        gestor=gestor,
        nombre=nombre,
        correo=correo,
        direccion=direccion,
        hallazgo=hallazgo,
        estado_notas=estado_notas,
    )
    return {"enviado": True, "destinatario": correo}


def trigger_resumen_semanal():
    enviados = NotificationService.enviar_resumen_semanal_a_todos()
    return {"enviados": enviados}


def usuarios_para_masivo(current_user, dependencia: str = None):
    usuarios = NotificationService.usuarios_para_masivo(current_user, dependencia)
    return [{"id": u.id, "nombre": u.nombre, "email": u.email, "rol": u.rol, "dependencia": u.dependencia} for u in usuarios]


def enviar_masiva(gestor, data: dict):
    user_ids = data.get("user_ids", [])
    asunto = data.get("asunto", "").strip()
    mensaje = data.get("mensaje", "").strip()
    if not asunto or not mensaje:
        return None, "Los campos 'asunto' y 'mensaje' son obligatorios"
    if not user_ids:
        return None, "Debes seleccionar al menos un destinatario"
    result = NotificationService.enviar_correo_masivo(gestor, user_ids, asunto, mensaje)
    return result, None
