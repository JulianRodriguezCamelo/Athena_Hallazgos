from dataclasses import dataclass
from typing import Optional


@dataclass
class HallazgoDTO:
    id: int
    codigo_del_hallazgo: Optional[str]
    descripcion: Optional[str]
    vicepresidencia: Optional[str]
    direccion: Optional[str]
    dependencia_reporta_ero: Optional[str]
    estado: Optional[str]
    estado_plan_accion: Optional[str]
    responsable_plan_accion: Optional[str]
    estado_accion: Optional[str]
    responsable_accion: Optional[str]
    fecha_cierre_proyectada: Optional[str]
    prorroga: Optional[str]
    upload_id: Optional[int]

    @classmethod
    def from_model(cls, h) -> "HallazgoDTO":
        return cls(
            id=h.id,
            codigo_del_hallazgo=h.codigo_del_hallazgo,
            descripcion=h.descripcion,
            vicepresidencia=h.vicepresidencia,
            direccion=h.direccion,
            dependencia_reporta_ero=h.dependencia_reporta_ero,
            estado=h.estado,
            estado_plan_accion=h.estado_plan_accion,
            responsable_plan_accion=h.responsable_plan_accion,
            estado_accion=h.estado_accion,
            responsable_accion=h.responsable_accion,
            fecha_cierre_proyectada=(
                h.fecha_cierre_proyectada.isoformat() if h.fecha_cierre_proyectada else None
            ),
            prorroga=h.prorroga,
            upload_id=h.upload_id,
        )
