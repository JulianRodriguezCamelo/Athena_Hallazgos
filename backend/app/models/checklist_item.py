from datetime import datetime, timezone
from app.extensions import db


class ChecklistItem(db.Model):
    __tablename__ = "checklist_items"

    id = db.Column(db.Integer, primary_key=True)
    actividad_id = db.Column(
        db.Integer, db.ForeignKey("actividades.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    descripcion = db.Column(db.Text, nullable=False)
    completado = db.Column(db.Boolean, default=False, nullable=False)
    fecha_completado = db.Column(db.DateTime, nullable=True)
    link_evidencia = db.Column(db.Text, nullable=True)
    completado_por_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    completado_por = db.relationship("User", foreign_keys=[completado_por_id], lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "actividad_id": self.actividad_id,
            "descripcion": self.descripcion,
            "completado": self.completado,
            "fecha_completado": self.fecha_completado.isoformat() if self.fecha_completado else None,
            "link_evidencia": self.link_evidencia,
            "completado_por": self.completado_por.nombre if self.completado_por else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<ChecklistItem actividad={self.actividad_id} completado={self.completado}>"
