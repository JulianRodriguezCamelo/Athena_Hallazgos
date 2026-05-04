from datetime import datetime, timezone
from app.extensions import db


class NotaSeguimiento(db.Model):
    __tablename__ = "notas_seguimiento"

    id = db.Column(db.Integer, primary_key=True)
    actividad_id = db.Column(
        db.Integer, db.ForeignKey("actividades.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    nota = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    autor = db.relationship("User", foreign_keys=[user_id], lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "actividad_id": self.actividad_id,
            "nota": self.nota,
            "autor": self.autor.nombre if self.autor else "—",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
