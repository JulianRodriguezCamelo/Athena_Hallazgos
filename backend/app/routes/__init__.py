from .auth import auth_bp
from .users import users_bp
from .hallazgos import hallazgos_bp
from .uploads import uploads_bp
from .dashboard import dashboard_bp

__all__ = ["auth_bp", "users_bp", "hallazgos_bp", "uploads_bp", "dashboard_bp"]
