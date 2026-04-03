from datetime import datetime, timezone
from app.extensions import db


class Actividad(db.Model):
    __tablename__ = "actividades"

    id = db.Column(db.Integer, primary_key=True)
    hallazgo_id = db.Column(
        db.Integer, db.ForeignKey("hallazgos.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    codigo_del_hallazgo = db.Column(db.String(100), nullable=True, index=True)
    orden = db.Column(db.Integer, default=0)

    # Datos del plan / acción
    id_plan_accion = db.Column(db.String(100), nullable=True)
    nombre_plan_accion = db.Column(db.String(300), nullable=True)
    descripcion = db.Column(db.Text, nullable=True)
    estado_plan_accion = db.Column(db.String(100), nullable=True)
    responsable = db.Column(db.String(200), nullable=True)
    estado_accion = db.Column(db.String(100), nullable=True)
    responsable_accion = db.Column(db.String(200), nullable=True)
    fecha_compromiso = db.Column(db.DateTime, nullable=True)
    prorroga = db.Column(db.String(100), nullable=True)
    fecha_prorroga = db.Column(db.DateTime, nullable=True)
    observaciones = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "hallazgo_id": self.hallazgo_id,
            "codigo_del_hallazgo": self.codigo_del_hallazgo,
            "orden": self.orden,
            "id_plan_accion": self.id_plan_accion,
            "nombre_plan_accion": self.nombre_plan_accion,
            "descripcion": self.descripcion,
            "estado_plan_accion": self.estado_plan_accion,
            "responsable": self.responsable,
            "estado_accion": self.estado_accion,
            "responsable_accion": self.responsable_accion,
            "fecha_compromiso": (
                self.fecha_compromiso.isoformat() if self.fecha_compromiso else None
            ),
            "prorroga": self.prorroga,
            "fecha_prorroga": (
                self.fecha_prorroga.isoformat() if self.fecha_prorroga else None
            ),
            "observaciones": self.observaciones,
        }

    def __repr__(self):
        return f"<Actividad hallazgo={self.hallazgo_id} plan={self.id_plan_accion}>"
