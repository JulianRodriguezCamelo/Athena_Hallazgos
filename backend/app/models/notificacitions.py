from app.extensions import db
from datetime import datetime, timezone


class Notification(db.Model):
    """Modelo de notificaciones del sistema."""
    __tablename__ = "notificacitions"   # nombre de tabla legacy, no cambiar sin migración

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    hallazgo_id = db.Column(db.Integer, db.ForeignKey("hallazgos.id"))
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.String(200), nullable=False)
    read = db.Column(db.Boolean, default=False)
    email_sent = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    type = db.Column(
        db.Enum(
            "vencimiento", "prorroga", "asignacion", "actualizacion", "alerta",
            name="notification_type_enum",
        ),
        nullable=False,
    )

    user = db.relationship("User", backref="notificaciones")
    hallazgo = db.relationship("Hallazgo", backref="notificaciones")

    def __repr__(self):
        return f"<Notification {self.title} [read={self.read}]>"

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "hallazgo_id": self.hallazgo_id,
            "title": self.title,
            "message": self.message,
            "read": self.read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "type": self.type,
        }


# Alias de compatibilidad con código que importa el nombre original con typo
Notificacition = Notification
