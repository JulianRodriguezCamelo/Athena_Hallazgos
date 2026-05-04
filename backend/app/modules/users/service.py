from app.extensions import db
from app.models.user import User


def list_users(current_user):
    query = User.query
    if current_user.rol == "directivo":
        query = query.filter_by(dependencia=current_user.dependencia)
    return query.order_by(User.nombre).all()


def get_by_id(user_id: int):
    return User.query.get_or_404(user_id)


def get_by_email(email: str):
    return User.query.filter_by(email=email.lower().strip()).first()


def create(data: dict):
    user = User(
        nombre=data["nombre"].strip(),
        email=data["email"].lower().strip(),
        rol=data["rol"],
        vicepresidencia=data.get("vicepresidencia", "").strip() or None,
        dependencia=data.get("dependencia", "").strip() or None,
        activo=data.get("activo", True),
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return user


def update(user: User, data: dict):
    if "nombre" in data:
        user.nombre = data["nombre"].strip()
    if "email" in data:
        user.email = data["email"].lower().strip()
    if "rol" in data:
        user.rol = data["rol"]
    if "vicepresidencia" in data:
        user.vicepresidencia = data["vicepresidencia"].strip() or None
    if "dependencia" in data:
        user.dependencia = data["dependencia"].strip() or None
    if "activo" in data:
        user.activo = bool(data["activo"])
    if "password" in data and data["password"]:
        user.set_password(data["password"])
    db.session.commit()
    return user


def deactivate(user: User):
    user.activo = False
    db.session.commit()


def distinct_dependencias():
    return db.session.query(User.dependencia)\
        .filter(User.dependencia.isnot(None))\
        .distinct().all()


def bulk_create(users_data: list[dict]) -> tuple[list, list]:
    """Create multiple users, skipping duplicates by email. Returns (created, skipped)."""
    created = []
    skipped = []
    for data in users_data:
        existing = get_by_email(data["email"])
        if existing:
            skipped.append({"email": data["email"], "razon": "Email ya registrado"})
            continue
        user = User(
            nombre=data["nombre"].strip(),
            email=data["email"].lower().strip(),
            rol=data["rol"],
            vicepresidencia=data.get("vicepresidencia") or None,
            dependencia=data.get("dependencia") or None,
            activo=data.get("activo", True),
        )
        user.set_password(data["password"])
        db.session.add(user)
        created.append(user)
    db.session.commit()
    return created, skipped


import os, re, tempfile

_COL_PATTERNS = {
    "codigo_usuario": re.compile(r"c[oó]digo[\s_]*(usuario|user)?", re.I),
    "nombre": re.compile(r"nombre[\s_]*(completo)?", re.I),
    "dependencia": re.compile(r"dependencia", re.I),
    "estado": re.compile(r"estado", re.I),
    "email": re.compile(r"correo|e[\s\-]?mail", re.I),
    "rol": re.compile(r"^rol$", re.I),
    "password": re.compile(r"contrase[ñn]a|password", re.I),
}

_ROL_NORM = {
    "vicepresidente": "vicepresidente",
    "vicepr": "vicepresidente",
    "directivo": "directivo",
    "profesional": "profesional",
    "gestor": "gestor",
    "administrador": "administrador",
}


def _normalize_rol(raw: str) -> str:
    raw = raw.strip().lower()
    for prefix, mapped in _ROL_NORM.items():
        if raw.startswith(prefix):
            return mapped
    return "profesional"


def parse_users_excel(file_path: str) -> tuple[list[dict], list[str]]:
    """Parse an Excel file with user data. Returns (users_list, errors)."""
    import pandas as pd
    errors = []
    users = []

    try:
        xf = pd.ExcelFile(file_path)
    except Exception as e:
        return [], [f"No se pudo leer el archivo: {e}"]

    for sheet_name in xf.sheet_names:
        try:
            df = xf.parse(sheet_name, dtype=str)
        except Exception:
            continue
        if df.empty:
            continue

        col_map: dict[str, str] = {}
        for col in df.columns:
            col_str = str(col).strip()
            for field, pattern in _COL_PATTERNS.items():
                if field not in col_map and pattern.search(col_str):
                    col_map[field] = col
                    break

        if "email" not in col_map:
            errors.append(f"Hoja '{sheet_name}': no se encontró columna de correo")
            continue

        for idx, row in df.iterrows():
            email_raw = row.get(col_map["email"], "")
            if not isinstance(email_raw, str) or not email_raw.strip() or email_raw.strip().lower() == "nan":
                continue

            nombre = str(row.get(col_map.get("nombre", ""), "") or "").strip()
            dependencia = str(row.get(col_map.get("dependencia", ""), "") or "").strip()
            estado_str = str(row.get(col_map.get("estado", ""), "activo") or "activo").strip().lower()
            rol_raw = str(row.get(col_map.get("rol", ""), "profesional") or "profesional").strip()
            password = str(row.get(col_map.get("password", ""), "") or "").strip()

            if not nombre:
                errors.append(f"Fila {idx + 2}: sin nombre, se omite")
                continue
            if not password:
                errors.append(f"Fila {idx + 2} ({email_raw.strip()}): sin contraseña, se omite")
                continue

            activo = estado_str in ("activo", "active", "1", "true", "sí", "si", "yes")

            users.append({
                "nombre": nombre,
                "email": email_raw.strip().lower(),
                "dependencia": dependencia or None,
                "activo": activo,
                "rol": _normalize_rol(rol_raw),
                "password": password,
            })

    return users, errors
