import logging
import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from sqlalchemy import text
from app.extensions import db
from app.models.hallazgo import Hallazgo
from app.models.actividad import Actividad
from app.models.upload_history import UploadHistory
from app.models.notificacitions import Notificacition
from app.models.user import User
from app.modules.uploads.service import parse_excel
from config import Config

logger = logging.getLogger(__name__)


def _build_user_token_index():
    """Índice de (apellidos_key, nombre_canónico) para normalizar responsables del Excel.
    Usa solo los 2 apellidos (últimos tokens únicos) para tolerar typos en el nombre de pila."""
    users = User.query.filter_by(activo=True).all()
    index = []
    for u in users:
        seen: set[str] = set()
        unique: list[str] = []
        for t in u.nombre.strip().split():
            tl = t.lower()
            if len(tl) > 2 and tl not in seen:
                seen.add(tl)
                unique.append(tl)
        key = unique[-2:] if len(unique) >= 2 else unique
        if key:
            index.append((key, u.nombre))
    return index


def _normalize_responsable(name: str, index: list) -> str:
    if not name or not name.strip():
        return name
    name_tokens = set(t.lower() for t in name.strip().split() if len(t) > 2)
    for key_tokens, canonical in index:
        if all(kt in name_tokens for kt in key_tokens):
            return canonical
    return name

_UPLOAD_LOCK_KEY = 7_654_321
ALLOWED = {"xlsx", "xls"}


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED


def process_upload(user, file):
    if not _allowed_file(file.filename):
        return None, "Solo se permiten archivos .xlsx o .xls"

    original_name = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{original_name}"
    save_path = os.path.join(Config.UPLOAD_FOLDER, unique_name)
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    file.save(save_path)

    locked = db.session.execute(
        text("SELECT pg_try_advisory_xact_lock(:key)"),
        {"key": _UPLOAD_LOCK_KEY},
    ).scalar()
    if not locked:
        try:
            os.remove(save_path)
        except OSError:
            pass
        return None, "Hay una carga en proceso, intente de nuevo en un momento"

    # Borrar en orden correcto respetando FKs:
    # notificaciones → actividades → hallazgos → upload_history
    counts = {
        "notificaciones": Notificacition.query.count(),
        "actividades": Actividad.query.count(),
        "hallazgos": Hallazgo.query.count(),
        "uploads": UploadHistory.query.count(),
    }
    logger.warning(
        "ELIMINACIÓN MASIVA iniciada por usuario id=%s — registros a eliminar: %s",
        user.id, counts,
    )
    Notificacition.query.delete(synchronize_session=False)
    Actividad.query.delete(synchronize_session=False)
    Hallazgo.query.delete(synchronize_session=False)
    UploadHistory.query.delete(synchronize_session=False)
    db.session.flush()

    history = UploadHistory(
        filename_original=original_name,
        filename_stored=unique_name,
        uploaded_by_id=user.id,
        estado="procesando",
    )
    db.session.add(history)
    db.session.flush()

    hallazgo_records, actividades_data, errors = parse_excel(save_path)

    # Normalizar nombres de responsables al formato canónico de la BD
    user_index = _build_user_token_index()
    responsable_fields = ("responsable_plan_accion", "responsable_accion", "reportado_por")
    for record in hallazgo_records:
        for field in responsable_fields:
            if record.get(field):
                record[field] = _normalize_responsable(record[field], user_index)
    for _, act in actividades_data:
        for field in ("responsable_accion", "responsable"):
            if act.get(field):
                act[field] = _normalize_responsable(act[field], user_index)

    exitosos = 0
    hallazgo_id_by_index: list[int | None] = []

    for record in hallazgo_records:
        try:
            hallazgo = Hallazgo(upload_id=history.id, **record)
            db.session.add(hallazgo)
            db.session.flush()
            hallazgo_id_by_index.append(hallazgo.id)
            exitosos += 1
        except Exception as e:
            errors.append(f"Error al guardar hallazgo: {str(e)}")
            hallazgo_id_by_index.append(None)

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
    return history, errors


def get_history(user, page: int, per_page: int):
    query = UploadHistory.query
    if user.rol == "gestor":
        query = query.filter_by(uploaded_by_id=user.id)
    paginated = query.order_by(UploadHistory.uploaded_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return paginated


def get_upload_detail(user, upload_id: int):
    upload = UploadHistory.query.get_or_404(upload_id)
    if user.rol == "directivo" and upload.uploaded_by_id != user.id:
        return None, "No tiene permisos para ver esta carga"
    return upload, None


def delete_upload(user, upload_id: int):
    upload = UploadHistory.query.get_or_404(upload_id)
    if user.rol == "directivo" and upload.uploaded_by_id != user.id:
        return False, "No tiene permisos para eliminar esta carga"
    hallazgo_ids = [h.id for h in Hallazgo.query.filter_by(upload_id=upload_id).with_entities(Hallazgo.id)]
    if hallazgo_ids:
        Notificacition.query.filter(Notificacition.hallazgo_id.in_(hallazgo_ids)).delete(synchronize_session=False)
    Hallazgo.query.filter_by(upload_id=upload_id).delete(synchronize_session=False)
    db.session.delete(upload)
    db.session.commit()
    return True, None


def analyze_upload(file):
    if not _allowed_file(file.filename):
        return None, "Solo se permiten archivos .xlsx o .xls"

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

    return {
        "total": len(hallazgos),
        "total_actividades": len(actividades_data),
        "vencidos": vencidos,
        "con_prorroga": con_prorroga,
        "por_estado": [{"estado": k, "total": v} for k, v in estado_sorted],
        "por_dependencia": [{"nombre": k, "total": v} for k, v in dep_sorted],
        "por_responsable": [{"nombre": k, "total": v} for k, v in resp_sorted],
        "errores": errors[:20],
    }, None
