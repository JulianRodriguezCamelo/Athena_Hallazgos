import os
from flask import Flask
from config import config
from app.extensions import db, jwt, cors


def create_app(config_name: str = "default") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Inicializar extensiones
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    # Registrar blueprints
    from app.routes import auth_bp, users_bp, hallazgos_bp, uploads_bp, dashboard_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(hallazgos_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(dashboard_bp)

    # Crear tablas y usuario admin por defecto
    with app.app_context():
        # Importar modelos para que SQLAlchemy los registre antes de create_all
        from app.models import hallazgo, actividad, user, upload_history  # noqa: F401
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
