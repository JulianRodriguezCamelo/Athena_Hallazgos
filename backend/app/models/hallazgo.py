from datetime import datetime, timezone
from app.extensions import db


class Hallazgo(db.Model):
    __tablename__ = "hallazgos"

    id = db.Column(db.Integer, primary_key=True)

    # --- Campos del Excel ---
    codigo_del_hallazgo = db.Column(db.String(100), nullable=True, index=True)
    descripcion = db.Column(db.Text, nullable=True)
    fecha_inicial_evento = db.Column(db.DateTime, nullable=True)
    fecha_finalizacion_evento = db.Column(db.DateTime, nullable=True)
    vicepresidencia = db.Column(db.String(200), nullable=True, index=True)
    dependencia_reporta_ero = db.Column(db.String(200), nullable=True, index=True)
    reportado_para = db.Column(db.String(200), nullable=True)
    estado = db.Column(db.String(100), nullable=True, index=True)
    reportado_por = db.Column(db.String(200), nullable=True)
    observaciones = db.Column(db.Text, nullable=True)
    aplicativo_afecta_ero = db.Column(db.String(200), nullable=True)
    fecha_cierre_proyectada = db.Column(db.DateTime, nullable=True)

    # Plan de Acción
    id_plan_accion = db.Column(db.String(100), nullable=True, index=True)
    nombre_plan_accion = db.Column(db.String(300), nullable=True)
    descripcion_plan_accion = db.Column(db.Text, nullable=True)
    estado_plan_accion = db.Column(db.String(100), nullable=True, index=True)
    responsable_plan_accion = db.Column(db.String(200), nullable=True, index=True)

    # Acción
    estado_accion = db.Column(db.String(100), nullable=True)
    responsable_accion = db.Column(db.String(200), nullable=True, index=True)

    # Prórroga
    prorroga = db.Column(db.String(100), nullable=True)
    fecha_cierre_final_prorroga = db.Column(db.DateTime, nullable=True)

    # Actividades asociadas
    actividades = db.relationship(
        "Actividad", backref="hallazgo", lazy="dynamic",
        cascade="all, delete-orphan", passive_deletes=True
    )

    # --- Metadatos del sistema ---
    upload_id = db.Column(
        db.Integer, db.ForeignKey("upload_history.id"), nullable=True, index=True
    )
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "codigo_del_hallazgo": self.codigo_del_hallazgo,
            "descripcion": self.descripcion,
            "fecha_inicial_evento": (
                self.fecha_inicial_evento.isoformat()
                if self.fecha_inicial_evento
                else None
            ),
            "fecha_finalizacion_evento": (
                self.fecha_finalizacion_evento.isoformat()
                if self.fecha_finalizacion_evento
                else None
            ),
            "vicepresidencia": self.vicepresidencia,
            "dependencia_reporta_ero": self.dependencia_reporta_ero,
            "reportado_para": self.reportado_para,
            "estado": self.estado,
            "reportado_por": self.reportado_por,
            "observaciones": self.observaciones,
            "aplicativo_afecta_ero": self.aplicativo_afecta_ero,
            "fecha_cierre_proyectada": (
                self.fecha_cierre_proyectada.isoformat()
                if self.fecha_cierre_proyectada
                else None
            ),
            "id_plan_accion": self.id_plan_accion,
            "nombre_plan_accion": self.nombre_plan_accion,
            "descripcion_plan_accion": self.descripcion_plan_accion,
            "estado_plan_accion": self.estado_plan_accion,
            "responsable_plan_accion": self.responsable_plan_accion,
            "estado_accion": self.estado_accion,
            "responsable_accion": self.responsable_accion,
            "prorroga": self.prorroga,
            "fecha_cierre_final_prorroga": (
                self.fecha_cierre_final_prorroga.isoformat()
                if self.fecha_cierre_final_prorroga
                else None
            ),
            "upload_id": self.upload_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Hallazgo {self.codigo_del_hallazgo} [{self.estado}]>"
