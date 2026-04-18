from datetime import date, timedelta
from flask_mail import Message
from app.extensions import mail, db
from app.models.notificacitions import Notificacition
from app.modules.notifcations.email_template import (
    build_email_html,
    build_bienvenida_html,
    build_resumen_semanal_html,
)


class NotificationService:

    # ── Email base ───────────────────────────────────────────────────────────

    @staticmethod
    def _send(to: str, subject: str, html: str, fallback: str = ""):
        msg = Message(subject=subject, recipients=[to])
        msg.body = fallback or subject
        msg.html = html
        mail.send(msg)

    # ── Guardar en sistema ───────────────────────────────────────────────────

    @staticmethod
    def _guardar(user_id: int, hallazgo_id: int, title: str, message: str, type: str, email_sent: bool = False):
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

        hoy = date.today()
        limite = hoy + timedelta(days=15)

        hallazgos = cls._hallazgos_por_rol(user)
        ids_hallazgos = [h.id for h in hallazgos]

        proximos_h = [
            h for h in hallazgos
            if h.fecha_cierre_proyectada and hoy <= h.fecha_cierre_proyectada.date() <= limite
        ]
        proximos_a = (
            Actividad.query
            .filter(
                Actividad.hallazgo_id.in_(ids_hallazgos),
                Actividad.fecha_compromiso.isnot(None),
                Actividad.fecha_compromiso >= hoy,
                Actividad.fecha_compromiso <= limite,
            )
            .all()
            if ids_hallazgos else []
        )

        stats = {
            "total": len(hallazgos),
            "pendientes": sum(1 for h in hallazgos if (h.estado or "").lower() in ("pendiente", "abierto", "open")),
            "en_proceso": sum(1 for h in hallazgos if (h.estado or "").lower() in ("en proceso", "en_proceso", "in progress")),
            "cerrados": sum(1 for h in hallazgos if (h.estado or "").lower() in ("cerrado", "closed", "resuelto")),
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
            for h in proximos_h[:10]
        ]
        actividades_data = [
            {
                "id": a.id,
                "descripcion": a.descripcion or "",
                "responsable": a.responsable or a.responsable_accion or "—",
                "fecha_compromiso": a.fecha_compromiso.strftime("%d %b %Y") if a.fecha_compromiso else "—",
                "estado_accion": a.estado_accion or "—",
            }
            for a in proximos_a[:10]
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
            fallback=f"Resumen semanal: {stats['total']} hallazgos, {len(proximos_h)} próximos a vencer.",
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
            return Hallazgo.query.filter_by(vicepresidencia=user.vicepresidencia).all()
        if rol == "gestor":
            return (
                Hallazgo.query
                .filter(or_(
                    Hallazgo.dependencia_reporta_ero == user.dependencia,
                    Hallazgo.responsable_plan_accion.ilike(f"%{user.nombre}%"),
                    Hallazgo.responsable_accion.ilike(f"%{user.nombre}%"),
                ))
                .all()
            )
        # tecnico
        return (
            Hallazgo.query
            .filter(or_(
                Hallazgo.responsable_accion.ilike(f"%{user.nombre}%"),
                Hallazgo.dependencia_reporta_ero == user.dependencia,
            ))
            .all()
        )

    @staticmethod
    def _usuarios_a_notificar_hallazgo(hallazgo):
        from app.models.user import User
        from sqlalchemy import or_
        return (
            User.query
            .filter_by(activo=True)
            .filter(or_(
                User.rol.in_(["vicepresidente", "directivo"]),
                User.nombre.ilike(f"%{hallazgo.responsable_plan_accion or ''}%"),
                User.nombre.ilike(f"%{hallazgo.responsable_accion or ''}%"),
            ))
            .all()
        )
