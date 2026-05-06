from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail
from flask_socketio import SocketIO
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()
mail = Mail()
socketio = SocketIO()
limiter = Limiter(key_func=get_remote_address, default_limits=[])
migrate = Migrate()


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """Verifica si el token fue revocado en logout."""
    from app.models.token_blocklist import TokenBlocklist
    jti = jwt_payload.get("jti")
    if not jti:
        return False
    return TokenBlocklist.query.filter_by(jti=jti).first() is not None
