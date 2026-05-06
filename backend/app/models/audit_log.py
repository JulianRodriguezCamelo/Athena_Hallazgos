from datetime import datetime, timezone
from app.extensions import db


class AuditLog(db.Model):
    """Registro de auditoría: quién cambió qué y cuándo."""
    __tablename__ = "audit_log"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(50), nullable=False)       # ej: "update_hallazgo"
    entity_type = db.Column(db.String(50), nullable=False)  # ej: "hallazgo"
    entity_id = db.Column(db.Integer, nullable=True)
    changes = db.Column(db.Text, nullable=True)             # JSON con {campo: [antes, después]}
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", backref="audit_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "changes": self.changes,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<AuditLog {self.action} on {self.entity_type}#{self.entity_id}>"


def log_action(user_id: int, action: str, entity_type: str,
               entity_id: int = None, changes: dict = None,
               ip_address: str = None):
    """Helper para registrar una acción de auditoría."""
    import json
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changes=json.dumps(changes, default=str) if changes else None,
        ip_address=ip_address,
    )
    db.session.add(entry)
    # No hacemos commit aquí; el commit lo maneja el caller
    return entry
