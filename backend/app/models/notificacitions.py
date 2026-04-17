from app.extensions import db
from datetime import datetime, timezone 

class Notificacition(db.Model):
    __tablename__ = "notificacitions"

    id = db.Column(db.Integer, primary_key=True)

    #----campos------------
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    hallazgo_id = db.Column(db.Integer, db.ForeignKey("hallazgos.id"))
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.String(200), nullable=False)
    read = db.Column(db.Boolean, default=False)
    email_sent = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    type = db.Column(db.Enum("vencimiento", "prorroga", "asignacion","actualizacion","alerta",name="notification_type_enum"),nullable=False)


    #---relations----
    user = db.relationship("User", backref="notificacitions")
    hallazgo = db.relationship("Hallazgo", backref="notificacitions")

    def __repr__(self):
        return f"<Notificacition {self.title} [{self.read}]>"

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

    
    