from dataclasses import dataclass
from typing import Optional


@dataclass
class UserDTO:
    id: int
    nombre: str
    email: str
    rol: str
    vicepresidencia: Optional[str]
    dependencia: Optional[str]
    activo: bool

    @classmethod
    def from_model(cls, u) -> "UserDTO":
        return cls(
            id=u.id,
            nombre=u.nombre,
            email=u.email,
            rol=u.rol,
            vicepresidencia=u.vicepresidencia,
            dependencia=u.dependencia,
            activo=u.activo,
        )
