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
