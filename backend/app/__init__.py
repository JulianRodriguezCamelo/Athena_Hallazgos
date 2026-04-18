import os
from flask import Flask
from config import config
from app.extensions import db, jwt, cors, mail


def create_app(config_name: str = "default") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Inicializar extensiones
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

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
        from app.models import hallazgo, actividad, user, upload_history, notificacitions  # noqa: F401

        # Asegurar que el valor 'gestor' exista en el ENUM de PostgreSQL
        from sqlalchemy import text
        try:
            db.session.execute(
                text("ALTER TYPE rol_enum ADD VALUE IF NOT EXISTS 'gestor'")
            )
            db.session.commit()
        except Exception:
            db.session.rollback()

        db.create_all()
        _seed_admin()

    return app


def _seed_admin():
    """Crea el usuario vicepresidente por defecto si no existe."""
    from app.models.user import User

    if not User.query.filter_by(email="admin@fiduprevisora.com").first():
        admin = User(
            nombre="Administrador",
            email="admin@fiduprevisora.com",
            rol="vicepresidente",
            dependencia="Vicepresidencia",
            activo=True,
        )
        admin.set_password("Admin2025*")
        db.session.add(admin)
        db.session.commit()
        print("[SEED] Usuario admin creado: admin@fiduprevisora.com / Admin2025*")
