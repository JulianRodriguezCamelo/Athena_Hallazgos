from dataclasses import dataclass
from typing import Optional


@dataclass
class ActividadDTO:
    id: int
    hallazgo_id: int
    codigo_del_hallazgo: Optional[str]
    orden: int
    descripcion: Optional[str]
    estado_plan_accion: Optional[str]
    responsable: Optional[str]
    estado_accion: Optional[str]
    responsable_accion: Optional[str]
    fecha_compromiso: Optional[str]
    prorroga: Optional[str]
    observaciones: Optional[str]

    @classmethod
    def from_model(cls, a) -> "ActividadDTO":
        return cls(
            id=a.id,
            hallazgo_id=a.hallazgo_id,
            codigo_del_hallazgo=a.codigo_del_hallazgo,
            orden=a.orden,
            descripcion=a.descripcion,
            estado_plan_accion=a.estado_plan_accion,
            responsable=a.responsable,
            estado_accion=a.estado_accion,
            responsable_accion=a.responsable_accion,
            fecha_compromiso=(
                a.fecha_compromiso.isoformat() if a.fecha_compromiso else None
            ),
            prorroga=a.prorroga,
            observaciones=a.observaciones,
        )
