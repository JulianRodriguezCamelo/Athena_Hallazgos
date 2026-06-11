import os
import logging
import logging.handlers
from flask import Flask, request
from config import config
from app.extensions import db, jwt, cors, mail, limiter, migrate
from app.modules.scheduler.scheduler import init_scheduler

logger = logging.getLogger(__name__)


def _configure_logging(app: Flask) -> None:
    """Configura logging centralizado con formato estructurado hacia stdout."""
    log_level = logging.DEBUG if app.config.get("DEBUG") else logging.INFO
    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)-8s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    handler = logging.StreamHandler()
    handler.setFormatter(fmt)

    root = logging.getLogger()
    root.setLevel(log_level)
    if not root.handlers:
        root.addHandler(handler)

    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("apscheduler").setLevel(logging.WARNING)


def create_app(config_name: str = "default") -> Flask:
    app = Flask(__name__)
    cfg = config[config_name]
    if config_name == "production" and hasattr(cfg, "validate"):
        cfg.validate()
    app.config.from_object(cfg)
    _configure_logging(app)

    # JWT blocklist habilitado
    app.config["JWT_BLACKLIST_ENABLED"] = True
    app.config["JWT_BLACKLIST_TOKEN_CHECKS"] = ["access"]

    # Inicializar extensiones
    db.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    redis_url = app.config.get("REDIS_URL")
    if redis_url:
        app.config["RATELIMIT_STORAGE_URI"] = redis_url
    limiter.init_app(app)
    migrate.init_app(app, db)

    from app.extensions import socketio
    socketio.init_app(
        app,
        cors_allowed_origins=app.config["CORS_ORIGINS"],
        async_mode="eventlet",
        message_queue=app.config.get("REDIS_URL"),
        logger=False,
        engineio_logger=False,
    )
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
    def _add_security_headers(response):
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "connect-src 'self' ws: wss:; "
            "frame-ancestors 'none'"
        )
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
    from app.modules.audit.api import audit_bp
    from app.modules.monitoring.api import monitoring_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(hallazgos_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(audit_bp)
    app.register_blueprint(monitoring_bp)

    with app.app_context():
        # Importar todos los modelos para que SQLAlchemy los registre
        from app.models import (  # noqa: F401
            hallazgo, actividad, user, upload_history,
            notificacitions, user_preferences, nota_seguimiento,
            checklist_item, token_blocklist, audit_log,
        )

        # Saltar create_all durante comandos de migración y arranque de gunicorn
        if not os.environ.get("FLASK_SKIP_DB_INIT"):
            db.create_all()
            _run_inline_migrations()
            _seed_admin()
        else:
            # Solo hacer seed del admin (las tablas ya existen via migración)
            try:
                _seed_admin()
            except Exception:
                pass

    @app.route("/health")
    def health():
        from flask import jsonify
        from sqlalchemy import text as sa_text
        import redis as redis_lib
        status = {"status": "ok", "db": "ok", "redis": "ok"}
        code = 200
        try:
            db.session.execute(sa_text("SELECT 1"))
        except Exception:
            status["db"] = "error"
            status["status"] = "degraded"
            code = 503
        try:
            r = redis_lib.from_url(app.config.get("REDIS_URL", "redis://redis:6379/0"), socket_connect_timeout=2)
            r.ping()
        except Exception:
            status["redis"] = "error"
            status["status"] = "degraded"
            code = 503
        return jsonify(status), code

    init_scheduler(app)
    return app


def _run_inline_migrations():
    """Aplica cambios de esquema idempotentes usando PL/SQL anónimo (Oracle)."""
    from sqlalchemy import text

    migrations = [
        # Agregar columna ultima_nota_at si no existe
        """
        DECLARE v_count NUMBER;
        BEGIN
          SELECT COUNT(*) INTO v_count FROM user_tab_columns
          WHERE table_name = 'ACTIVIDADES' AND column_name = 'ULTIMA_NOTA_AT';
          IF v_count = 0 THEN
            EXECUTE IMMEDIATE 'ALTER TABLE actividades ADD ultima_nota_at TIMESTAMP';
          END IF;
        END;
        """,
        # Crear checklist_items si no existe
        """
        DECLARE v_count NUMBER;
        BEGIN
          SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'CHECKLIST_ITEMS';
          IF v_count = 0 THEN
            EXECUTE IMMEDIATE 'CREATE TABLE checklist_items (
              id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
              actividad_id NUMBER NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
              descripcion CLOB NOT NULL,
              completado NUMBER(1,0) DEFAULT 0 NOT NULL,
              fecha_completado TIMESTAMP,
              link_evidencia VARCHAR2(500),
              completado_por_id NUMBER REFERENCES users(id) ON DELETE SET NULL,
              created_at TIMESTAMP DEFAULT SYSDATE NOT NULL
            )';
          END IF;
        END;
        """,
        # Índice checklist_items
        """
        DECLARE v_count NUMBER;
        BEGIN
          SELECT COUNT(*) INTO v_count FROM user_indexes
          WHERE index_name = 'IX_CHECKLIST_ITEMS_ACTIVIDAD_ID';
          IF v_count = 0 THEN
            EXECUTE IMMEDIATE 'CREATE INDEX ix_checklist_items_actividad_id ON checklist_items(actividad_id)';
          END IF;
        END;
        """,
        # Crear token_blocklist si no existe
        """
        DECLARE v_count NUMBER;
        BEGIN
          SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'TOKEN_BLOCKLIST';
          IF v_count = 0 THEN
            EXECUTE IMMEDIATE 'CREATE TABLE token_blocklist (
              id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
              jti VARCHAR2(36) NOT NULL UNIQUE,
              created_at TIMESTAMP DEFAULT SYSDATE NOT NULL
            )';
          END IF;
        END;
        """,
        # Índice token_blocklist
        """
        DECLARE v_count NUMBER;
        BEGIN
          SELECT COUNT(*) INTO v_count FROM user_indexes WHERE index_name = 'IX_TOKEN_BLOCKLIST_JTI';
          IF v_count = 0 THEN
            EXECUTE IMMEDIATE 'CREATE UNIQUE INDEX ix_token_blocklist_jti ON token_blocklist(jti)';
          END IF;
        END;
        """,
        # Crear audit_log si no existe
        """
        DECLARE v_count NUMBER;
        BEGIN
          SELECT COUNT(*) INTO v_count FROM user_tables WHERE table_name = 'AUDIT_LOG';
          IF v_count = 0 THEN
            EXECUTE IMMEDIATE 'CREATE TABLE audit_log (
              id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
              user_id NUMBER REFERENCES users(id),
              action VARCHAR2(50) NOT NULL,
              entity_type VARCHAR2(50) NOT NULL,
              entity_id NUMBER,
              changes CLOB,
              ip_address VARCHAR2(45),
              created_at TIMESTAMP DEFAULT SYSDATE NOT NULL
            )';
          END IF;
        END;
        """,
        # Índices audit_log
        """
        DECLARE v_count NUMBER;
        BEGIN
          SELECT COUNT(*) INTO v_count FROM user_indexes WHERE index_name = 'IX_AUDIT_LOG_ENTITY';
          IF v_count = 0 THEN
            EXECUTE IMMEDIATE 'CREATE INDEX ix_audit_log_entity ON audit_log(entity_type, entity_id)';
          END IF;
        END;
        """,
        """
        DECLARE v_count NUMBER;
        BEGIN
          SELECT COUNT(*) INTO v_count FROM user_indexes WHERE index_name = 'IX_AUDIT_LOG_USER';
          IF v_count = 0 THEN
            EXECUTE IMMEDIATE 'CREATE INDEX ix_audit_log_user ON audit_log(user_id)';
          END IF;
        END;
        """,
    ]

    for sql in migrations:
        try:
            db.session.execute(text(sql))
            db.session.commit()
        except Exception:
            db.session.rollback()


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
        logger.warning(
            "[SEED] Usuario admin creado: admin@fiduprevisora.com — cambie la contraseña"
        )
    else:
        existing = User.query.filter_by(email="admin@fiduprevisora.com").first()
        if existing and existing.rol == "vicepresidente":
            existing.rol = "administrador"
            db.session.commit()
            logger.info("[SEED] Usuario admin migrado al rol administrador")
