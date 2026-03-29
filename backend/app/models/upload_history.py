from datetime import datetime, timezone
from app.extensions import db


class UploadHistory(db.Model):
    __tablename__ = "upload_history"

    id = db.Column(db.Integer, primary_key=True)
    filename_original = db.Column(db.String(300), nullable=False)
    filename_stored = db.Column(db.String(300), nullable=False)
    uploaded_by_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    total_registros = db.Column(db.Integer, default=0)
    registros_exitosos = db.Column(db.Integer, default=0)
    registros_fallidos = db.Column(db.Integer, default=0)
    estado = db.Column(
        db.Enum("procesando", "completado", "error", name="upload_estado_enum"),
        default="procesando",
    )
    errores = db.Column(db.Text, nullable=True)
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relación con hallazgos generados
    hallazgos = db.relationship("Hallazgo", backref="upload", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "filename_original": self.filename_original,
            "uploaded_by_id": self.uploaded_by_id,
            "uploaded_by": self.uploader.nombre if self.uploader else None,
            "total_registros": self.total_registros,
            "registros_exitosos": self.registros_exitosos,
            "registros_fallidos": self.registros_fallidos,
            "estado": self.estado,
            "errores": self.errores,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }

    def __repr__(self):
        return f"<UploadHistory {self.filename_original} by {self.uploaded_by_id}>"
