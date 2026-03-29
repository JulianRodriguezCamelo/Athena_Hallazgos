from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.hallazgo import Hallazgo
from app.utils.decorators import get_current_user, min_role

hallazgos_bp = Blueprint("hallazgos", __name__, url_prefix="/api/hallazgos")


def _apply_role_filter(query, user):
    """Filtra hallazgos según el rol del usuario."""
    if user.rol == "vicepresidente":
        return query  # Ve todo
    if user.rol == "directivo":
        # Ve los de su dependencia
        return query.filter(
            Hallazgo.dependencia_reporta_ero == user.dependencia
        )
    if user.rol == "tecnico":
        # Ve solo donde es responsable (plan de acción o acción)
        nombre = user.nombre
        return query.filter(
            db.or_(
                Hallazgo.responsable_plan_accion.ilike(f"%{nombre}%"),
                Hallazgo.responsable_accion.ilike(f"%{nombre}%"),
                Hallazgo.reportado_por.ilike(f"%{nombre}%"),
            )
        )
    return query.filter(db.false())


@hallazgos_bp.route("/", methods=["GET"])
@jwt_required()
def list_hallazgos():
    user = get_current_user()
    query = _apply_role_filter(Hallazgo.query, user)

    # Filtros opcionales
    estado = request.args.get("estado")
    dependencia = request.args.get("dependencia")
    responsable = request.args.get("responsable")
    estado_plan = request.args.get("estado_plan_accion")
    search = request.args.get("search")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))

    if estado:
        query = query.filter(Hallazgo.estado.ilike(f"%{estado}%"))
    if dependencia and user.rol == "vicepresidente":
        query = query.filter(Hallazgo.dependencia_reporta_ero.ilike(f"%{dependencia}%"))
    if responsable:
        query = query.filter(
            db.or_(
                Hallazgo.responsable_plan_accion.ilike(f"%{responsable}%"),
                Hallazgo.responsable_accion.ilike(f"%{responsable}%"),
            )
        )
    if estado_plan:
        query = query.filter(Hallazgo.estado_plan_accion.ilike(f"%{estado_plan}%"))
    if search:
        query = query.filter(
            db.or_(
                Hallazgo.codigo_evento.ilike(f"%{search}%"),
                Hallazgo.descripcion.ilike(f"%{search}%"),
                Hallazgo.nombre_plan_accion.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(Hallazgo.fecha_inicial_evento.desc())
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "hallazgos": [h.to_dict() for h in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": paginated.page,
        "per_page": paginated.per_page,
    }), 200


@hallazgos_bp.route("/<int:hallazgo_id>", methods=["GET"])
@jwt_required()
def get_hallazgo(hallazgo_id):
    user = get_current_user()
    query = _apply_role_filter(Hallazgo.query, user)
    hallazgo = query.filter_by(id=hallazgo_id).first()

    if not hallazgo:
        return jsonify({"error": "Hallazgo no encontrado o sin permisos"}), 404

    return jsonify({"hallazgo": hallazgo.to_dict()}), 200


@hallazgos_bp.route("/<int:hallazgo_id>", methods=["PUT"])
@jwt_required()
@min_role("directivo")
def update_hallazgo(hallazgo_id):
    user = get_current_user()
    query = _apply_role_filter(Hallazgo.query, user)
    hallazgo = query.filter_by(id=hallazgo_id).first()

    if not hallazgo:
        return jsonify({"error": "Hallazgo no encontrado o sin permisos"}), 404

    data = request.get_json()
    campos_editables = [
        "estado", "observaciones", "estado_plan_accion",
        "responsable_plan_accion", "estado_accion", "responsable_accion",
        "prorroga", "fecha_cierre_final_prorroga", "fecha_cierre_proyectada",
    ]
    for campo in campos_editables:
        if campo in data:
            setattr(hallazgo, campo, data[campo])

    db.session.commit()
    return jsonify({"message": "Hallazgo actualizado", "hallazgo": hallazgo.to_dict()}), 200


@hallazgos_bp.route("/estados", methods=["GET"])
@jwt_required()
def get_estados():
    """Retorna los valores únicos de estado para filtros."""
    user = get_current_user()
    query = _apply_role_filter(Hallazgo.query, user)
    estados = db.session.query(Hallazgo.estado).filter(
        Hallazgo.estado.isnot(None)
    ).distinct().all()
    return jsonify({"estados": [e[0] for e in estados if e[0]]}), 200


@hallazgos_bp.route("/dependencias", methods=["GET"])
@jwt_required()
@min_role("directivo")
def get_dependencias():
    """Retorna las dependencias únicas (solo vice y directivo)."""
    dependencias = db.session.query(Hallazgo.dependencia_reporta_ero).filter(
        Hallazgo.dependencia_reporta_ero.isnot(None)
    ).distinct().all()
    return jsonify({"dependencias": [d[0] for d in dependencias if d[0]]}), 200
