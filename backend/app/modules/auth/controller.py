from flask_jwt_extended import create_access_token
from app.extensions import db
from app.modules.auth import service


def login(email: str, password: str):
    user = service.find_by_email(email)
    if not user or not user.check_password(password):
        return None, "Credenciales inválidas"
    if not user.activo:
        return None, "Usuario inactivo. Contacte al administrador"
    token = create_access_token(identity=str(user.id))
    return {"access_token": token, "user": user.to_dict()}, None


def get_me(user_id):
    user = service.find_by_id(user_id)
    return user.to_dict() if user else None


def revoke_token(jti: str):
    """Agrega el JTI al blocklist para invalidar el token."""
    if not jti:
        return
    from app.models.token_blocklist import TokenBlocklist
    entry = TokenBlocklist(jti=jti)
    db.session.add(entry)
    db.session.commit()
