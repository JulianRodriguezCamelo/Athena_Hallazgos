import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.utils.decorators import get_current_user, role_required
from app.models.audit_log import AuditLog
from app.models.user import User
from app.extensions import db

audit_bp = Blueprint("audit", __name__, url_prefix="/api/audit-logs")


@audit_bp.route("/", methods=["GET"])
@jwt_required()
@role_required("administrador")
def list_audit_logs():
    page = int(request.args.get("page", 1))
    per_page = min(int(request.args.get("per_page", 50)), 200)
    entity_type = request.args.get("entity_type")
    user_id = request.args.get("user_id", type=int)
    action = request.args.get("action")
    desde = request.args.get("desde")
    hasta = request.args.get("hasta")

    query = db.session.query(AuditLog)

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if desde:
        try:
            from datetime import datetime
            dt = datetime.strptime(desde, "%Y-%m-%d")
            query = query.filter(AuditLog.created_at >= dt)
        except ValueError:
            pass
    if hasta:
        try:
            from datetime import datetime, timedelta
            dt = datetime.strptime(hasta, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(AuditLog.created_at < dt)
        except ValueError:
            pass

    query = query.order_by(AuditLog.created_at.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    # Enriquecer con nombre de usuario
    user_cache: dict[int, str] = {}

    def enrich(log: AuditLog) -> dict:
        d = log.to_dict()
        if log.user_id:
            if log.user_id not in user_cache:
                u = User.query.get(log.user_id)
                user_cache[log.user_id] = u.nombre if u else f"Usuario #{log.user_id}"
            d["user_nombre"] = user_cache[log.user_id]
        else:
            d["user_nombre"] = "Sistema"
        # Parsear changes JSON para el frontend
        if d.get("changes"):
            try:
                d["changes"] = json.loads(d["changes"])
            except (ValueError, TypeError):
                pass
        return d

    return jsonify({
        "logs": [enrich(log) for log in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": paginated.page,
        "per_page": paginated.per_page,
    }), 200


@audit_bp.route("/actions", methods=["GET"])
@jwt_required()
@role_required("administrador")
def list_actions():
    """Devuelve la lista de acciones únicas registradas (para el filtro del frontend)."""
    actions = (
        db.session.query(AuditLog.action)
        .distinct()
        .order_by(AuditLog.action)
        .all()
    )
    return jsonify({"actions": [a[0] for a in actions]}), 200
