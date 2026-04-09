import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models.hallazgo import Hallazgo
from app.models.actividad import Actividad
from app.models.upload_history import UploadHistory
from app.services.excel_parser import parse_excel
from app.utils.decorators import get_current_user, min_role
from config import Config

uploads_bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")

ALLOWED = {"xlsx", "xls"}


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED


@uploads_bp.route("/", methods=["POST"])
@jwt_required()
@min_role("directivo")
def upload_excel():
    user = get_current_user()

    if "file" not in request.files:
        return jsonify({"error": "No se envió ningún archivo"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Nombre de archivo vacío"}), 400

    if not _allowed_file(file.filename):
        return jsonify({"error": "Solo se permiten archivos .xlsx o .xls"}), 400

    # Guardar archivo con nombre único
    original_name = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{original_name}"
    save_path = os.path.join(Config.UPLOAD_FOLDER, unique_name)
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    file.save(save_path)

    # Carga global: eliminar todos los hallazgos y actividades existentes
    Actividad.query.delete()
    Hallazgo.query.delete()
    UploadHistory.query.delete()
    db.session.flush()

    # Crear registro de historial
    history = UploadHistory(
        filename_original=original_name,
        filename_stored=unique_name,
        uploaded_by_id=user.id,
        estado="procesando",
    )
    db.session.add(history)
    db.session.flush()  # Para obtener el ID

    # Parsear Excel
    hallazgo_records, actividades_data, errors = parse_excel(save_path)

    exitosos = 0
    # Lista de IDs de hallazgos en orden posicional para vincular actividades
    hallazgo_id_by_index: list[int | None] = []

    for record in hallazgo_records:
        try:
            hallazgo = Hallazgo(upload_id=history.id, **record)
            db.session.add(hallazgo)
            db.session.flush()  # Obtener el ID generado
            hallazgo_id_by_index.append(hallazgo.id)
            exitosos += 1
        except Exception as e:
            errors.append(f"Error al guardar hallazgo: {str(e)}")
            hallazgo_id_by_index.append(None)

    # Guardar actividades vinculadas por índice posicional al hallazgo correspondiente
    for hallazgo_idx, actividad_dict in actividades_data:
        if hallazgo_idx < len(hallazgo_id_by_index):
            hallazgo_id = hallazgo_id_by_index[hallazgo_idx]
            if hallazgo_id:
                try:
                    actividad = Actividad(hallazgo_id=hallazgo_id, **actividad_dict)
                    db.session.add(actividad)
                except Exception as e:
                    errors.append(f"Error al guardar actividad: {str(e)}")

    history.total_registros = len(hallazgo_records)
    history.registros_exitosos = exitosos
    history.registros_fallidos = len(hallazgo_records) - exitosos + len(
        [e for e in errors if "No se pudo" in e or "No se reconocieron" in e]
    )
    history.estado = "completado" if exitosos > 0 else "error"
    history.errores = "\n".join(errors) if errors else None

    db.session.commit()

    return jsonify({
        "message": "Archivo procesado exitosamente",
        "upload": history.to_dict(),
        "errores": errors[:10],
    }), 201


@uploads_bp.route("/history", methods=["GET"])
@jwt_required()
@min_role("directivo")
def upload_history():
    user = get_current_user()
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))

    query = UploadHistory.query

    # Directivo ve solo sus propias cargas; vice ve todas
    if user.rol == "directivo":
        query = query.filter_by(uploaded_by_id=user.id)

    paginated = query.order_by(UploadHistory.uploaded_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "history": [h.to_dict() for h in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": paginated.page,
    }), 200


@uploads_bp.route("/history/<int:upload_id>", methods=["GET"])
@jwt_required()
@min_role("directivo")
def get_upload_detail(upload_id):
    user = get_current_user()
    upload = UploadHistory.query.get_or_404(upload_id)

    if user.rol == "directivo" and upload.uploaded_by_id != user.id:
        return jsonify({"error": "No tiene permisos para ver esta carga"}), 403

    return jsonify({"upload": upload.to_dict()}), 200


@uploads_bp.route("/history/<int:upload_id>", methods=["DELETE"])
@jwt_required()
@min_role("directivo")
def delete_upload(upload_id):
    user = get_current_user()
    upload = UploadHistory.query.get_or_404(upload_id)

    if user.rol == "directivo" and upload.uploaded_by_id != user.id:
        return jsonify({"error": "No tiene permisos para eliminar esta carga"}), 403

    # Actividades eliminadas en cascada al borrar hallazgos
    Hallazgo.query.filter_by(upload_id=upload_id).delete()
    db.session.delete(upload)
    db.session.commit()

    return jsonify({"message": "Carga eliminada exitosamente"}), 200


@uploads_bp.route("/analyze", methods=["POST"])
@jwt_required()
def analyze_excel():
    """Analiza un Excel y retorna estadísticas sin guardar en BD."""
    if "file" not in request.files:
        return jsonify({"error": "No se envió ningún archivo"}), 400

    file = request.files["file"]
    if file.filename == "" or not _allowed_file(file.filename):
        return jsonify({"error": "Solo se permiten archivos .xlsx o .xls"}), 400

    original_name = secure_filename(file.filename)
    unique_name = f"tmp_analyze_{uuid.uuid4().hex}_{original_name}"
    save_path = os.path.join(Config.UPLOAD_FOLDER, unique_name)
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    file.save(save_path)

    try:
        hallazgos, actividades_data, errors = parse_excel(save_path)
    finally:
        try:
            os.remove(save_path)
        except OSError:
            pass

    hoy = datetime.now()

    por_estado: dict[str, int] = {}
    por_dependencia: dict[str, int] = {}
    por_responsable: dict[str, int] = {}
    vencidos = 0
    con_prorroga = 0

    for h in hallazgos:
        estado = h.get("estado") or "Sin estado"
        por_estado[estado] = por_estado.get(estado, 0) + 1

        dep = h.get("dependencia_reporta_ero") or "Sin dependencia"
        por_dependencia[dep] = por_dependencia.get(dep, 0) + 1

        resp = h.get("responsable_plan_accion")
        if resp:
            por_responsable[resp] = por_responsable.get(resp, 0) + 1

        fecha_cierre = h.get("fecha_cierre_proyectada")
        estado_h = (h.get("estado") or "").lower()
        if (
            fecha_cierre
            and isinstance(fecha_cierre, datetime)
            and fecha_cierre < hoy
            and "cerrado" not in estado_h
            and "cerrada" not in estado_h
        ):
            vencidos += 1

        if h.get("prorroga"):
            con_prorroga += 1

    dep_sorted = sorted(por_dependencia.items(), key=lambda x: x[1], reverse=True)[:10]
    resp_sorted = sorted(por_responsable.items(), key=lambda x: x[1], reverse=True)[:10]
    estado_sorted = sorted(por_estado.items(), key=lambda x: x[1], reverse=True)

    return jsonify({
        "total": len(hallazgos),
        "total_actividades": len(actividades_data),
        "vencidos": vencidos,
        "con_prorroga": con_prorroga,
        "por_estado": [{"estado": k, "total": v} for k, v in estado_sorted],
        "por_dependencia": [{"nombre": k, "total": v} for k, v in dep_sorted],
        "por_responsable": [{"nombre": k, "total": v} for k, v in resp_sorted],
        "errores": errors[:20],
    }), 200
