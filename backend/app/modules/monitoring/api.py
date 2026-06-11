import time
import os
from flask import Blueprint, jsonify
from sqlalchemy import text
from app.extensions import db

monitoring_bp = Blueprint("monitoring", __name__, url_prefix="/api/monitoring")

_start_time = time.time()


@monitoring_bp.route("/health", methods=["GET"])
def health():
    """Health check público sin autenticación."""
    status = {"status": "ok", "db": "ok", "redis": "ok", "uptime_seconds": int(time.time() - _start_time)}
    code = 200

    try:
        db.session.execute(text("SELECT 1"))
    except Exception:
        status["db"] = "error"
        status["status"] = "degraded"
        code = 503

    try:
        import redis as redis_lib
        from flask import current_app
        r = redis_lib.from_url(
            current_app.config.get("REDIS_URL", "redis://redis:6379/0"),
            socket_connect_timeout=2,
        )
        r.ping()
    except Exception:
        status["redis"] = "error"
        status["status"] = "degraded"
        code = 503

    return jsonify(status), code


@monitoring_bp.route("/ready", methods=["GET"])
def ready():
    """Readiness probe — verifica que la app puede recibir tráfico."""
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify({"status": "ready"}), 200
    except Exception:
        return jsonify({"status": "not_ready", "reason": "db_unavailable"}), 503
