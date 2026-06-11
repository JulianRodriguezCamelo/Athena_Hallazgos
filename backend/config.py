import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "hallazgos-secret-key-2025-fiduprevisora")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-hallazgos-secret-2025")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)

    DB_HOST = os.environ.get("DB_HOST", "localhost")
    DB_PORT = os.environ.get("DB_PORT", "1521")
    DB_SERVICE = os.environ.get("DB_SERVICE", "XEPDB1")
    DB_USER = os.environ.get("DB_USER", "hallazgos")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "hallazgos")

    SQLALCHEMY_DATABASE_URI = (
        f"oracle+oracledb://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_SERVICE}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {"xlsx", "xls"}

    CORS_ORIGINS = os.environ.get(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")

    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 587))
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USE_SSL = False
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER", MAIL_USERNAME)

    SCHEDULER_ENABLED = os.environ.get("SCHEDULER_ENABLED", "false")

    REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

    @classmethod
    def validate(cls):
        weak_defaults = {
            "hallazgos-secret-key-2025-fiduprevisora",
            "jwt-hallazgos-secret-2025",
        }
        if cls.SECRET_KEY in weak_defaults or len(cls.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY insegura o no configurada para producción")
        if cls.JWT_SECRET_KEY in weak_defaults or len(cls.JWT_SECRET_KEY) < 32:
            raise ValueError("JWT_SECRET_KEY insegura o no configurada para producción")
        if cls.DB_PASSWORD in ("hallazgos", "oracle", "", "password"):
            raise ValueError("DB_PASSWORD insegura para producción")


class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-secret-key-only-for-pytest"
    SECRET_KEY = "test-secret-key-only-for-pytest"
    SCHEDULER_ENABLED = "false"
    MAIL_SUPPRESS_SEND = True
    WTF_CSRF_ENABLED = False
    RATELIMIT_ENABLED = False


config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
