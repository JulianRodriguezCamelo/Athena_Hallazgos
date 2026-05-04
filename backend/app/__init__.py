import os
import logging
from flask import Flask, request
from config import config
from app.extensions import db, jwt, cors, mail, limiter
from app.modules.scheduler.scheduler import init_scheduler

logger = logging.getLogger(__name__)


def create_app(config_name: str = "default") -> Flask:
    app = Flask(__name__)
    cfg = config[config_name]
    if config_name == "production" and hasattr(cfg, "validate"):
        cfg.validate()
    app.config.from_object(cfg)

    # Inicializar extensiones
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    limiter.init_app(app)
    from app.extensions import socketio
    socketio.init_app(app, cors_allowed_origins=app.config["CORS_ORIGINS"], async_mode="eventlet",
                  logger=False, engineio_logger=False)
    from app.sockets import register_handlers
    register_handlers(socketio)
    cors.init_app(
        app,
        resources={r"/api/.*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        max_age=600,
    )

    @app.after_request
    def _add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin and origin in app.config["CORS_ORIGINS"]:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers.setdefault(
                "Access-Control-Allow-Headers", "Content-Type, Authorization"
            )
            response.headers.setdefault(
                "Access-Control-Allow-Methods",
                "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
            )
        return response

    # Registrar blueprints
    from app.modules.auth.api import auth_bp
    from app.modules.users.api import users_bp
    from app.modules.hallazgos.api import hallazgos_bp
    from app.modules.uploads.api import uploads_bp
    from app.modules.dashboard.api import dashboard_bp
    from app.modules.notifcations.api import notifications_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(hallazgos_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(notifications_bp)


    # Crear tablas y usuario admin por defecto
    with app.app_context():
        # Importar modelos para que SQLAlchemy los registre antes de create_all
        from app.models import hallazgo, actividad, user, upload_history, notificacitions, user_preferences, nota_seguimiento, checklist_item  # noqa: F401

        # Asegurar que los valores existan en el ENUM de PostgreSQL
        from sqlalchemy import text
        for valor in ("gestor", "administrador"):
            try:
                db.session.execute(
                    text(f"ALTER TYPE rol_enum ADD VALUE IF NOT EXISTS '{valor}'")
                )
                db.session.commit()
            except Exception:
                db.session.rollback()

        db.create_all()

        # Migraciones inline: columnas agregadas después del despliegue inicial
        try:
            db.session.execute(
                text("ALTER TABLE actividades ADD COLUMN IF NOT EXISTS ultima_nota_at TIMESTAMP")
            )
            db.session.commit()
        except Exception:
            db.session.rollback()
        try:
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS checklist_items (
                    id SERIAL PRIMARY KEY,
                    actividad_id INTEGER NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
                    descripcion TEXT NOT NULL,
                    completado BOOLEAN NOT NULL DEFAULT FALSE,
                    fecha_completado TIMESTAMP,
                    link_evidencia TEXT,
                    completado_por_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """))
            db.session.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_checklist_items_actividad_id ON checklist_items(actividad_id)"
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()
        _seed_admin()
    
    init_scheduler(app)

    return app


def _seed_admin():
    """Crea el usuario administrador del sistema por defecto si no existe."""
    from app.models.user import User

    if not User.query.filter_by(email="admin@fiduprevisora.com").first():
        admin = User(
            nombre="Administrador",
            email="admin@fiduprevisora.com",
            rol="administrador",
            dependencia="Sistemas",
            activo=True,
        )
        admin.set_password("Admin2025*")
        db.session.add(admin)
        db.session.commit()
        logger.warning("[SEED] Usuario admin creado: admin@fiduprevisora.com — cambie la contraseña inmediatamente")
    else:
        existing = User.query.filter_by(email="admin@fiduprevisora.com").first()
        if existing and existing.rol == "vicepresidente":
            existing.rol = "administrador"
            db.session.commit()
            logger.info("[SEED] Usuario admin migrado al rol administrador")
