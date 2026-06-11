from datetime import date, timedelta
from flask_mail import Message
from app.extensions import mail, db
from app.models.notificacitions import Notificacition
from app.utils import strip_accents
from app.modules.notifcations.email_template import (
    build_email_html,
    build_bienvenida_html,
    build_resumen_semanal_html,
    build_notificacion_personalizada_html,
)


class NotificationService:

    @classmethod
    def _is_enabled(cls) -> bool:
        import os
        return os.environ.get("NOTIFICATIONS_ENABLED", "false").lower() == "true"

    # ── Email base ───────────────────────────────────────────────────────────

    @classmethod
    def _send(cls, to: str, subject: str, html: str, fallback: str = ""):
        if not cls._is_enabled():
            return
        msg = Message(subject=subject, recipients=[to])
        msg.body = fallback or subject
        msg.html = html
        mail.send(msg)

    # ── Guardar en sistema ───────────────────────────────────────────────────

    @classmethod
    def _guardar(cls, user_id: int, hallazgo_id: int, title: str, message: str, type: str, email_sent: bool = False):
        if not cls._is_enabled():
            return None
        notificacion = Notificacition(
            user_id=user_id,
            hallazgo_id=hallazgo_id,
            title=title,
            message=message,
            type=type,
            email_sent=email_sent,
        )
        db.session.add(notificacion)
        db.session.commit()
        try:
            from app.extensions import socketio
            socketio.emit("new_notification", notificacion.to_dict(), room=f"user_{user_id}")
        except Exception:
            pass
        return notificacion

    # ── Notificación genérica (hallazgo) ─────────────────────────────────────

    @classmethod
    def notify(cls, user, hallazgo_id: int, title: str, message: str, type: str,
               send_email: bool = True, prioridad: str = None, area: str = None):
        notificacion = cls._guardar(user.id, hallazgo_id, title, message, type, email_sent=send_email)
        if send_email:
            html = build_email_html(
                user_name=user.nombre,
                type=type,
                title=title,
                message=message,
                hallazgo_id=hallazgo_id,
                prioridad=prioridad,
                area=area,
            )
            cls._send(
                to=user.email,
                subject=f"[{type.upper()}] {title}",
                html=html,
                fallback=message,
            )
        return notificacion

    # ── Usuario registrado ───────────────────────────────────────────────────

    @classmethod
    def notificar_usuario_registrado(cls, user, password_temporal: str = None):
        html = build_bienvenida_html(
            user_name=user.nombre,
            email=user.email,
            rol=user.rol,
            password_temporal=password_temporal,
        )
        cls._send(
            to=user.email,
            subject="Bienvenido a Athena — Tu cuenta ha sido creada",
            html=html,
            fallback=f"Hola {user.nombre}, tu cuenta en Athena ha sido creada. Accede con: {user.email}",
        )

    # ── Alerta de vencimiento (manual desde gestor) ──────────────────────────

    @classmethod
    def alerta_vencimiento_hallazgo(cls, gestor, hallazgo):
        from app.models.user import User
        fecha = hallazgo.fecha_cierre_proyectada
        fecha_str = fecha.strftime("%d %b %Y") if fecha else "Sin fecha"
        title = f"Hallazgo próximo a vencer: {hallazgo.codigo_del_hallazgo or f'#{hallazgo.id}'}"
        message = (
            f"El hallazgo '{hallazgo.descripcion[:100]}' vence el {fecha_str}. "
            f"Revisión solicitada por {gestor.nombre}."
        )

        usuarios = cls._usuarios_a_notificar_hallazgo(hallazgo)
        for user in usuarios:
            notif = cls._guardar(user.id, hallazgo.id, title, message, "alerta", email_sent=True)
            html = build_email_html(
                user_name=user.nombre,
                type="Alerta de Vencimiento",
                title=title,
                message=message,
                hallazgo_id=hallazgo.id,
                fecha=fecha_str,
                prioridad="Alta",
                area=hallazgo.vicepresidencia,
            )
            cls._send(to=user.email, subject=f"[ALERTA] {title}", html=html, fallback=message)
        return len(usuarios)

    @classmethod
    def alerta_vencimiento_actividad(cls, gestor, actividad):
        from app.models.user import User
        fecha = actividad.fecha_prorroga or actividad.fecha_compromiso
        fecha_str = fecha.strftime("%d %b %Y") if fecha else "Sin fecha"
        hallazgo = actividad.hallazgo
        title = f"Actividad próxima a vencer — {hallazgo.codigo_del_hallazgo or f'Hallazgo #{hallazgo.id}'}"
        message = (
            f"La actividad '{actividad.descripcion[:100]}' vence el {fecha_str}. "
            f"Revisión solicitada por {gestor.nombre}."
        )

        usuarios = cls._usuarios_a_notificar_hallazgo(hallazgo)
        for user in usuarios:
            cls._guardar(user.id, hallazgo.id, title, message, "alerta", email_sent=True)
            html = build_email_html(
                user_name=user.nombre,
                type="Alerta Actividad",
                title=title,
                message=message,
                hallazgo_id=hallazgo.id,
                fecha=fecha_str,
                prioridad="Alta",
                area=hallazgo.vicepresidencia,
            )
            cls._send(to=user.email, subject=f"[ALERTA] {title}", html=html, fallback=message)
        return len(usuarios)

    # ── Resumen semanal ──────────────────────────────────────────────────────

    @classmethod
    def enviar_resumen_semanal_a_todos(cls):
        from app.models.user import User
        usuarios = User.query.filter_by(activo=True).all()
        enviados = 0
        for user in usuarios:
            try:
                cls._enviar_resumen_a_usuario(user)
                enviados += 1
            except Exception:
                pass
        return enviados

    @classmethod
    def _enviar_resumen_a_usuario(cls, user):
        from app.models.hallazgo import Hallazgo
        from app.models.actividad import Actividad

        _estados_cerrado = ("cerrado", "closed", "resuelto")

        hallazgos = cls._hallazgos_por_rol(user)
        ids_hallazgos = [h.id for h in hallazgos]

        activos_h = [
            h for h in hallazgos
            if (h.estado or "").lower() not in _estados_cerrado
        ]

        activas_a = (
            Actividad.query
            .filter(
                Actividad.hallazgo_id.in_(ids_hallazgos),
                ~Actividad.estado_accion.ilike("%cerrad%"),
            )
            .all()
            if ids_hallazgos else []
        )

        stats = {
            "total": len(hallazgos),
            "pendientes": sum(1 for h in hallazgos if (h.estado or "").lower() in ("pendiente", "abierto", "open")),
            "en_proceso": sum(1 for h in hallazgos if (h.estado or "").lower() in ("en proceso", "en_proceso", "in progress")),
            "cerrados": sum(1 for h in hallazgos if (h.estado or "").lower() in _estados_cerrado),
        }

        hallazgos_data = [
            {
                "id": h.id,
                "codigo": h.codigo_del_hallazgo or f"#{h.id}",
                "descripcion": h.descripcion or "",
                "fecha_cierre": h.fecha_cierre_proyectada.strftime("%d %b %Y") if h.fecha_cierre_proyectada else "—",
                "estado": h.estado or "—",
                "vicepresidencia": h.vicepresidencia or "—",
            }
            for h in activos_h[:50]
        ]
        actividades_data = [
            {
                "id": a.id,
                "descripcion": a.descripcion or "",
                "responsable": a.responsable or a.responsable_accion or "—",
                "fecha_compromiso": a.fecha_compromiso.strftime("%d %b %Y") if a.fecha_compromiso else "—",
                "estado_accion": a.estado_accion or "—",
            }
            for a in activas_a[:50]
        ]

        html = build_resumen_semanal_html(
            user_name=user.nombre,
            rol=user.rol,
            hallazgos_proximos=hallazgos_data,
            actividades_proximas=actividades_data,
            stats=stats,
        )
        cls._send(
            to=user.email,
            subject=f"[RESUMEN SEMANAL] {date.today().strftime('%d %b %Y')} — Athena",
            html=html,
            fallback=f"Resumen semanal: {stats['total']} hallazgos, {len(activos_h)} activos.",
        )

    # ── Consultas ────────────────────────────────────────────────────────────

    @staticmethod
    def obtener_notificaciones(user_id: int):
        return Notificacition.query.filter_by(user_id=user_id).order_by(Notificacition.created_at.desc()).all()

    @staticmethod
    def _hallazgos_por_rol(user):
        from app.models.hallazgo import Hallazgo
        from sqlalchemy import or_

        rol = user.rol
        if rol == "vicepresidente":
            return Hallazgo.query.all()
        if rol == "directivo":
            filtros = []
            if user.vicepresidencia:
                filtros.append(Hallazgo.vicepresidencia.ilike(user.vicepresidencia))
            if user.dependencia:
                filtros.append(Hallazgo.dependencia_reporta_ero.ilike(user.dependencia))
            if not filtros:
                return []
            return Hallazgo.query.filter(or_(*filtros)).all()
        if rol == "gestor":
            nombre_norm = strip_accents(user.nombre)
            filtros = []
            if user.vicepresidencia:
                filtros.append(Hallazgo.vicepresidencia.ilike(f"%{user.vicepresidencia}%"))
            if user.dependencia:
                filtros.append(Hallazgo.dependencia_reporta_ero.ilike(f"%{user.dependencia}%"))
            filtros += [
                Hallazgo.responsable_plan_accion.ilike(f"%{nombre_norm}%"),
                Hallazgo.responsable_accion.ilike(f"%{nombre_norm}%"),
            ]
            return Hallazgo.query.filter(or_(*filtros)).all()
        # profesional
        nombre_norm = strip_accents(user.nombre)
        return (
            Hallazgo.query
            .filter(or_(
                Hallazgo.responsable_accion.ilike(f"%{nombre_norm}%"),
                Hallazgo.dependencia_reporta_ero == user.dependencia,
            ))
            .all()
        )
    
       # ── Alertas y notificaciones ────────────────────────────────────────────────────────────

    @classmethod
    def alerta_vencimiento_automatica(cls, entidad, tipo: str):
        try:
            if tipo == "hallazgo":
                hallazgo = entidad
                fecha = hallazgo.fecha_cierre_proyectada
                fecha_str = fecha.strftime("%d %b %Y") if fecha else "Sin fecha"
                usuarios = cls._usuarios_a_notificar_hallazgo(hallazgo)
                title = f"Vencimiento próximo — {hallazgo.codigo_del_hallazgo or f'#{hallazgo.id}'}"
                msg = (
                    f"El hallazgo '{(hallazgo.descripcion or '')[:80]}' vence el {fecha_str}. "
                    f"Por favor revisa el estado del plan de acción."
                )
                hallazgo_id = hallazgo.id
            else:
                from app.models.hallazgo import Hallazgo
                hallazgo = Hallazgo.query.get(entidad.hallazgo_id)
                usuarios = cls._usuarios_a_notificar_hallazgo(hallazgo) if hallazgo else []
                fecha = entidad.fecha_prorroga or entidad.fecha_compromiso
                fecha_str = fecha.strftime("%d %b %Y") if fecha else "Sin fecha"
                title = f"Actividad por vencer — {entidad.codigo_del_hallazgo or f'#{entidad.id}'}"
                msg = (
                    f"La actividad '{(entidad.descripcion or '')[:80]}' vence el {fecha_str}. "
                    f"Registra una nota o actualiza el estado."
                )
                hallazgo_id = entidad.hallazgo_id

            for u in usuarios:
                cls._guardar(u.id, hallazgo_id, title, msg, "vencimiento", email_sent=True)
                html = build_email_html(
                    user_name=u.nombre,
                    type="Alerta de Vencimiento",
                    title=title,
                    message=msg,
                    hallazgo_id=hallazgo_id,
                    fecha=fecha_str,
                    prioridad="Alta",
                    area=hallazgo.vicepresidencia if hallazgo else None,
                )
                try:
                    cls._send(to=u.email, subject=f"[ALERTA] {title}", html=html, fallback=msg)
                except Exception:
                    pass
        except Exception:
            pass

    @classmethod
    def alerta_nota_mensual(cls, actividad):
        try:
            from app.models.hallazgo import Hallazgo
            from app.models.notificacitions import Notificacition
            from datetime import datetime, timezone, timedelta

            hallazgo = Hallazgo.query.get(actividad.hallazgo_id)
            if not hallazgo:
                return

            # Evitar enviar más de una alerta por actividad en los últimos 7 días
            hace_7_dias = datetime.now(timezone.utc) - timedelta(days=7)
            ya_enviada = Notificacition.query.filter(
                Notificacition.hallazgo_id == hallazgo.id,
                Notificacition.type == "alerta",
                Notificacition.created_at >= hace_7_dias,
                Notificacition.title.like("%Nota mensual%"),
            ).first()
            if ya_enviada:
                return

            usuarios = cls._usuarios_a_notificar_hallazgo(hallazgo)
            codigo = hallazgo.codigo_del_hallazgo or f"#{hallazgo.id}"
            title = f"Nota mensual pendiente — {codigo}"
            msg = (
                f"La actividad '{(actividad.descripcion or '')[:80]}' no tiene nota o evidencia "
                f"registrada en los últimos 30 días. La regla mensual exige al menos una actualización "
                f"por mes para mantener el seguimiento activo."
            )
            for u in usuarios:
                cls._guardar(u.id, hallazgo.id, title, msg, "alerta", email_sent=True)
                html = build_email_html(
                    user_name=u.nombre,
                    type="Regla Mensual",
                    title=title,
                    message=msg,
                    hallazgo_id=hallazgo.id,
                    prioridad="Media",
                    area=hallazgo.vicepresidencia,
                )
                try:
                    cls._send(
                        to=u.email,
                        subject=f"[RECORDATORIO] {title}",
                        html=html,
                        fallback=msg,
                    )
                except Exception:
                    pass
        except Exception:
            pass



    @staticmethod
    def _usuarios_a_notificar_hallazgo(hallazgo):
        from app.models.user import User
        from sqlalchemy import or_

        vp_directivos = (
            User.query
            .filter_by(activo=True)
            .filter(User.rol.in_(["vicepresidente", "directivo"]))
            .all()
        )

        # Gestores de la misma vicepresidencia del hallazgo
        gestores = []
        if hallazgo.vicepresidencia:
            gestores = (
                User.query
                .filter_by(activo=True, rol="gestor")
                .filter(User.vicepresidencia.ilike(f"%{hallazgo.vicepresidencia}%"))
                .all()
            )

        # Usuarios nombrados como responsables
        responsables = []
        for nombre in filter(None, [hallazgo.responsable_plan_accion, hallazgo.responsable_accion]):
            nombre_norm = strip_accents(nombre)
            responsables += (
                User.query
                .filter_by(activo=True)
                .filter(User.nombre.ilike(f"%{nombre_norm}%"))
                .all()
            )

        vistos: set[int] = set()
        resultado = []
        for u in vp_directivos + gestores + responsables:
            if u.id not in vistos:
                vistos.add(u.id)
                resultado.append(u)
        return resultado

    @classmethod
    def notificar_asignacion(cls, hallazgo, campo: str, nuevo_responsable: str, actor):
        try:
            from app.models.user import User
            from app.modules.notifcations.email_template import build_email_html
            from datetime import datetime, timezone
            usuario = User.query.filter(User.nombre.ilike(f"%{strip_accents(nuevo_responsable)}%")).first()
            title = f"Nueva asignación — {hallazgo.codigo_del_hallazgo or f'#{hallazgo.id}'}"
            msg = f"Has sido asignado como responsable ({campo.replace('_', ' ')})."
            if usuario:
                cls._guardar(usuario.id, hallazgo.id, title, msg, "asignacion", email_sent=True)
                cls._send(usuario.email, title, build_email_html(
                    nombre=usuario.nombre, tipo="asignacion", titulo=title, mensaje=msg,
                    prioridad="alta", fecha=str(datetime.now(timezone.utc).date()), area="",
                ))
            vps = User.query.filter_by(rol="vicepresidente", activo=True).all()
            for vp in vps:
                if not usuario or vp.id != usuario.id:
                    cls._guardar(vp.id, hallazgo.id, title, msg, "asignacion", email_sent=False)
        except Exception:
            pass

    @classmethod
    def notificar_actualizacion_estado(cls, hallazgo, estado_anterior: str, estado_nuevo: str, actor):
        try:
            usuarios = cls._usuarios_a_notificar_hallazgo(hallazgo)
            title = f"Estado actualizado — {hallazgo.codigo_del_hallazgo or f'#{hallazgo.id}'}"
            msg = f"Estado cambió de '{estado_anterior}' a '{estado_nuevo}'."
            for u in usuarios:
                cls._guardar(u.id, hallazgo.id, title, msg, "actualizacion", email_sent=False)
        except Exception:
            pass

    @classmethod
    def enviar_notificacion_personalizada(cls, gestor, nombre: str, correo: str,
                                          direccion: str, hallazgo: str, estado_notas: str):
        html = build_notificacion_personalizada_html(
            nombre=nombre,
            direccion=direccion,
            hallazgo=hallazgo,
            estado_notas=estado_notas,
            gestor_nombre=gestor.nombre,
        )
        cls._send(
            to=correo,
            subject=f"[RECORDATORIO] {hallazgo or 'Notificación de gestión'} — Athena",
            html=html,
            fallback=f"Hola {nombre}, {gestor.nombre} te envía un recordatorio sobre: {hallazgo}. Notas: {estado_notas}",
        )

    # ── Correo masivo ────────────────────────────────────────────────────────

    @classmethod
    def enviar_correo_masivo(cls, gestor, user_ids: list, asunto: str, mensaje: str) -> dict:
        from app.models.user import User
        usuarios = User.query.filter(User.id.in_(user_ids), User.activo == True).all()
        enviados, fallidos = 0, 0
        for user in usuarios:
            try:
                html = build_notificacion_personalizada_html(
                    nombre=user.nombre,
                    direccion=user.dependencia or "",
                    hallazgo=asunto,
                    estado_notas=mensaje,
                    gestor_nombre=gestor.nombre,
                )
                cls._send(to=user.email, subject=f"[ATHENA] {asunto}", html=html, fallback=mensaje)
                enviados += 1
            except Exception:
                fallidos += 1
        return {"enviados": enviados, "fallidos": fallidos, "total": len(usuarios)}

    @classmethod
    def usuarios_para_masivo(cls, current_user, dependencia: str = None) -> list:
        from app.models.user import User
        q = User.query.filter_by(activo=True).filter(User.id != current_user.id)
        if current_user.rol == "gestor":
            q = q.filter(User.vicepresidencia == current_user.vicepresidencia)
        elif current_user.rol == "directivo":
            q = q.filter(User.vicepresidencia == current_user.vicepresidencia)
        # vicepresidente ve todos
        if dependencia:
            q = q.filter(User.dependencia.ilike(f"%{dependencia}%"))
        return q.order_by(User.nombre).all()

    @classmethod
    def notificar_cambio_estado_actividad(cls, hallazgo, actividad, estado_anterior: str, estado_nuevo: str, actor):
        try:
            from app.modules.notifcations.email_template import build_email_html
            from datetime import datetime, timezone
            codigo = hallazgo.codigo_del_hallazgo or f"#{hallazgo.id}"
            title = f"Actividad actualizada — {codigo}"
            msg = (
                f"La actividad '{(actividad.descripcion or '')[:80]}' cambió de "
                f"'{estado_anterior}' a '{estado_nuevo}'."
            )
            usuarios = cls._usuarios_a_notificar_hallazgo(hallazgo)
            for u in usuarios:
                if actor and u.id == actor.id:
                    continue
                cls._guardar(u.id, hallazgo.id, title, msg, "actualizacion", email_sent=True)
                html = build_email_html(
                    user_name=u.nombre,
                    type="Actividad Actualizada",
                    title=title,
                    message=msg,
                    hallazgo_id=hallazgo.id,
                    area=hallazgo.vicepresidencia,
                )
                try:
                    cls._send(to=u.email, subject=f"[ACTUALIZACIÓN] {title}", html=html, fallback=msg)
                except Exception:
                    pass
        except Exception:
            pass

    @classmethod
    def notificar_todas_actividades_cerradas(cls, hallazgo, actor):
        try:
            from app.modules.notifcations.email_template import build_email_html
            codigo = hallazgo.codigo_del_hallazgo or f"#{hallazgo.id}"
            title = f"Todas las actividades completadas — {codigo}"
            msg = (
                f"Todas las actividades del hallazgo '{(hallazgo.descripcion or '')[:80]}' "
                f"han sido cerradas o completadas. Puedes proceder con el cierre del hallazgo."
            )
            usuarios = cls._usuarios_a_notificar_hallazgo(hallazgo)
            for u in usuarios:
                cls._guardar(u.id, hallazgo.id, title, msg, "actualizacion", email_sent=True)
                html = build_email_html(
                    user_name=u.nombre,
                    type="Actividades Completadas",
                    title=title,
                    message=msg,
                    hallazgo_id=hallazgo.id,
                    prioridad="Alta",
                    area=hallazgo.vicepresidencia,
                )
                try:
                    cls._send(to=u.email, subject=f"[COMPLETADO] {title}", html=html, fallback=msg)
                except Exception:
                    pass
        except Exception:
            pass

    @classmethod
    def notificar_prorroga(cls, hallazgo, nueva_prorroga: str, actor):
        try:
            from app.modules.notifcations.email_template import build_email_html
            from datetime import datetime, timezone
            usuarios = cls._usuarios_a_notificar_hallazgo(hallazgo)
            title = f"Prórroga registrada — {hallazgo.codigo_del_hallazgo or f'#{hallazgo.id}'}"
            msg = f"Se registró prórroga: '{nueva_prorroga}'."
            for u in usuarios:
                cls._guardar(u.id, hallazgo.id, title, msg, "prorroga", email_sent=True)
                cls._send(u.email, title, build_email_html(
                    nombre=u.nombre, tipo="prorroga", titulo=title, mensaje=msg,
                    prioridad="alta", fecha=str(datetime.now(timezone.utc).date()), area="",
                ))
        except Exception:
            pass