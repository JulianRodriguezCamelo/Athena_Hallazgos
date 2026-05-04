from datetime import datetime, timezone, timedelta
from app.extensions import db


class Actividad(db.Model):
    __tablename__ = "actividades"

    id = db.Column(db.Integer, primary_key=True)
    hallazgo_id = db.Column(
        db.Integer, db.ForeignKey("hallazgos.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    codigo_del_hallazgo = db.Column(db.Text, nullable=True, index=True)
    orden = db.Column(db.Integer, default=0)

    # Datos del plan / acción
    descripcion = db.Column(db.Text, nullable=True)
    estado_plan_accion = db.Column(db.String(100), nullable=True)
    responsable = db.Column(db.String(200), nullable=True)
    estado_accion = db.Column(db.String(100), nullable=True)
    responsable_accion = db.Column(db.String(200), nullable=True)
    fecha_compromiso = db.Column(db.DateTime, nullable=True)
    prorroga = db.Column(db.String(100), nullable=True)
    fecha_prorroga = db.Column(db.DateTime, nullable=True)
    observaciones = db.Column(db.Text, nullable=True)

    # Seguimiento de notas
    ultima_nota_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    notas = db.relationship(
        "NotaSeguimiento",
        backref="actividad",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="NotaSeguimiento.created_at.desc()",
    )

    checklist_items = db.relationship(
        "ChecklistItem",
        backref="actividad",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="ChecklistItem.created_at.asc()",
    )

    @property
    def progreso_checklist(self) -> dict:
        items = self.checklist_items.all()
        total = len(items)
        completados = sum(1 for i in items if i.completado)
        return {"completados": completados, "total": total}

    @property
    def sin_nota_mensual(self) -> bool:
        estado = (self.estado_accion or "").lower()
        if any(k in estado for k in ("cerrado", "completado", "cumplido")):
            return False
        if not self.ultima_nota_at:
            return True
        limite = datetime.now(timezone.utc) - timedelta(days=30)
        ts = self.ultima_nota_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return ts < limite

    def to_dict(self):
        return {
            "id": self.id,
            "hallazgo_id": self.hallazgo_id,
            "codigo_del_hallazgo": self.codigo_del_hallazgo,
            "orden": self.orden,
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
            "ultima_nota_at": (
                self.ultima_nota_at.isoformat() if self.ultima_nota_at else None
            ),
            "sin_nota_mensual": self.sin_nota_mensual,
            "progreso_checklist": self.progreso_checklist,
        }

    def __repr__(self):
        return f"<Actividad hallazgo={self.hallazgo_id} orden={self.orden}>"
