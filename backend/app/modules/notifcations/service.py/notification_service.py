from flask_mail import Message
from app import mail, db
from app.models.notificacitions import Notificacition

class NotificationService:
    @staticmethod
    def envia_email_flask(to: str, subject: str, body: str):
        msg = Message(
            subject=subject,
            body=body,
            recipients=[to],
        )
        mail.send(msg)

    @staticmethod
    def crear_notification_en_el_sistema(user_id: int, hallazgo_id: int, title: str, message: str, type: str, email_sent: bool = False):
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

    @staticmethod
    def enviar_notificacion(user_email: str, hallazgo_id: int, title: str, message: str, type: str):
        try:
            NotificationService.envia_email_flask(
                to=user_email,
                subject=f"[{type.upper()}] {title}",
                body=message,
            )
        except Exception as e:
            raise RuntimeError(f"Error enviando email: {e}") from e

    @staticmethod
    def obtener_notificaciones(user_id: int):
        return Notificacition.query.filter_by(user_id=user_id).order_by(Notificacition.created_at.desc()).all()

    @classmethod
    def notify(cls, user, hallazgo_id: int, title: str, message: str, type: str, send_email: bool = True):
        notificacion = cls.crear_notification_en_el_sistema(
            user_id=user.id,
            hallazgo_id=hallazgo_id,
            title=title,
            message=message,
            type=type,
            email_sent=send_email,
        )
        if send_email:
            cls.enviar_notificacion(
                user_email=user.email,
                hallazgo_id=hallazgo_id,
                title=title,
                message=message,
                type=type,
            )
        return notificacion
