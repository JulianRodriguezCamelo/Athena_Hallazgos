from dataclasses import dataclass
from typing import Optional


@dataclass
class UploadDTO:
    id: int
    filename_original: str
    uploaded_by_id: int
    uploaded_by: Optional[str]
    total_registros: int
    registros_exitosos: int
    registros_fallidos: int
    estado: str
    errores: Optional[str]
    uploaded_at: Optional[str]

    @classmethod
    def from_model(cls, u) -> "UploadDTO":
        return cls(
            id=u.id,
            filename_original=u.filename_original,
            uploaded_by_id=u.uploaded_by_id,
            uploaded_by=u.uploader.nombre if u.uploader else None,
            total_registros=u.total_registros,
            registros_exitosos=u.registros_exitosos,
            registros_fallidos=u.registros_fallidos,
            estado=u.estado,
            errores=u.errores,
            uploaded_at=u.uploaded_at.isoformat() if u.uploaded_at else None,
        )
