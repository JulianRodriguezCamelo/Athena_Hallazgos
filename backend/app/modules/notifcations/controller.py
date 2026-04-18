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


def trigger_resumen_semanal():
    enviados = NotificationService.enviar_resumen_semanal_a_todos()
    return {"enviados": enviados}
