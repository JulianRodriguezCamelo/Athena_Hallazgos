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

_UPLOAD_LOCK_KEY = 7_654_321
ALLOWED = {"xlsx", "xls"}

# Campos del modelo Hallazgo que se actualizan en un re-import (upsert).
# No incluye campos de metadatos (id, created_at) ni campos que solo editan usuarios.
_UPSERT_FIELDS = frozenset({
    "descripcion", "vicepresidencia", "dependencia_reporta_ero", "direccion",
    "fecha_inicial_evento", "fecha_finalizacion_evento", "estado",
    "reportado_para", "reportado_por", "aplicativo_afecta_ero",
    "fecha_cierre_proyectada", "descripcion_plan_accion", "estado_plan_accion",
    "responsable_plan_accion", "estado_accion", "responsable_accion",
    "prorroga", "fecha_cierre_final_prorroga", "observaciones",
    "id_plan_accion", "nombre_plan_accion",
})


def _build_user_token_index():
    """Índice de (apellidos_key, nombre_canónico) para normalizar responsables."""
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


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED


def process_upload(user, file):
    """
    Importa un Excel usando upsert (insert o update por codigo_del_hallazgo).
    NO borra datos existentes. Las actividades del hallazgo se reemplazan
    con los datos del Excel. Toda la operación corre dentro de una transacción.
    """
    if not _allowed_file(file.filename):
        return None, "Solo se permiten archivos .xlsx o .xls"

    original_name = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{original_name}"
    save_path = os.path.join(Config.UPLOAD_FOLDER, unique_name)
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    file.save(save_path)

    # Lock optimista: detectar si ya hay una carga en proceso
    from sqlalchemy.exc import OperationalError
    try:
        db.session.execute(
            text("SELECT id FROM upload_history WHERE estado = 'procesando' FOR UPDATE NOWAIT")
        )
        locked = True
    except OperationalError:
        locked = False
    if not locked:
        try:
            os.remove(save_path)
        except OSError:
            pass
        return None, "Hay una carga en proceso, intente de nuevo en un momento"

    history = UploadHistory(
        filename_original=original_name,
        filename_stored=unique_name,
        uploaded_by_id=user.id,
        estado="procesando",
    )
    db.session.add(history)
    db.session.flush()

    try:
        hallazgo_records, actividades_data, errors = parse_excel(save_path)
    except Exception as e:
        try:
            os.remove(save_path)
        except OSError:
            pass
        db.session.rollback()
        return None, f"Error al leer el archivo Excel: {str(e)}"

    try:

        # Normalizar nombres de responsables al formato canónico de la BD
        user_index = _build_user_token_index()
        for record in hallazgo_records:
            for field in ("responsable_plan_accion", "responsable_accion", "reportado_por"):
                if record.get(field):
                    record[field] = _normalize_responsable(record[field], user_index)
        for _, act in actividades_data:
            for field in ("responsable_accion", "responsable"):
                if act.get(field):
                    act[field] = _normalize_responsable(act[field], user_index)

        # Agrupar actividades por índice de hallazgo
        acts_by_hidx: dict[int, list[dict]] = {}
        for hidx, adict in actividades_data:
            acts_by_hidx.setdefault(hidx, []).append(adict)

        exitosos = 0
        hallazgo_id_by_index: list[int | None] = []

        for record in hallazgo_records:
            sp = db.session.begin_nested()  # savepoint por registro
            try:
                codigo = record.get("codigo_del_hallazgo")
                existing = (
                    Hallazgo.query.filter_by(codigo_del_hallazgo=codigo).first()
                    if codigo else None
                )

                if existing:
                    # UPSERT: actualizar campos del Excel sin borrar datos manuales
                    for field, value in record.items():
                        if field in _UPSERT_FIELDS and value is not None:
                            setattr(existing, field, value)
                    existing.upload_id = history.id
                    hallazgo = existing
                else:
                    hallazgo = Hallazgo(upload_id=history.id, **record)
                    db.session.add(hallazgo)

                db.session.flush()
                hallazgo_id_by_index.append(hallazgo.id)
                sp.commit()
                exitosos += 1
            except Exception as e:
                sp.rollback()
                codigo_str = record.get("codigo_del_hallazgo", "?")
                errors.append(f"Error hallazgo '{codigo_str}': {str(e)}")
                hallazgo_id_by_index.append(None)

        # Procesar actividades: reemplazar las del hallazgo con los datos del Excel
        for hidx, acts in acts_by_hidx.items():
            if hidx >= len(hallazgo_id_by_index):
                continue
            hallazgo_id = hallazgo_id_by_index[hidx]
            if not hallazgo_id:
                continue
            sp2 = db.session.begin_nested()
            try:
                existing_acts = {
                    a.orden: a
                    for a in Actividad.query.filter_by(hallazgo_id=hallazgo_id).all()
                }
                ordenes_excel = set()
                for adict in acts:
                    orden = adict.get("orden")
                    ordenes_excel.add(orden)
                    if orden in existing_acts:
                        for k, v in adict.items():
                            if v is not None:
                                setattr(existing_acts[orden], k, v)
                    else:
                        db.session.add(Actividad(hallazgo_id=hallazgo_id, **adict))
                sp2.commit()
            except Exception as e:
                sp2.rollback()
                errors.append(f"Error actividades hallazgo_id={hallazgo_id}: {str(e)}")

        history.total_registros = len(hallazgo_records)
        history.registros_exitosos = exitosos
        history.registros_fallidos = len(hallazgo_records) - exitosos
        history.estado = "completado" if exitosos > 0 else "error"
        history.errores = "\n".join(errors) if errors else None

        db.session.commit()
        logger.info(
            "Upload completado — user_id=%s, exitosos=%d, fallidos=%d",
            user.id, exitosos, len(hallazgo_records) - exitosos,
        )
        try:
            os.remove(save_path)
        except OSError:
            pass
        return history, errors

    except Exception as e:
        db.session.rollback()
        logger.error("Error crítico en process_upload user_id=%s: %s", user.id, e)
        try:
            os.remove(save_path)
        except OSError:
            pass
        try:
            history.estado = "error"
            history.errores = f"Error crítico: {str(e)}"
            db.session.add(history)
            db.session.commit()
        except Exception:
            pass
        return None, f"Error crítico durante la importación: {str(e)}"


def get_history(user, page: int, per_page: int):
    query = UploadHistory.query
    if user.rol in ("directivo", "gestor"):
        query = query.filter_by(uploaded_by_id=user.id)
    paginated = query.order_by(UploadHistory.uploaded_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return paginated


def get_upload_detail(user, upload_id: int):
    upload = UploadHistory.query.get_or_404(upload_id)
    if user.rol in ("directivo", "gestor") and upload.uploaded_by_id != user.id:
        return None, "No tiene permisos para ver esta carga"
    return upload, None


def delete_upload(user, upload_id: int):
    upload = UploadHistory.query.get_or_404(upload_id)
    if user.rol in ("directivo", "gestor") and upload.uploaded_by_id != user.id:
        return False, "No tiene permisos para eliminar esta carga"
    hallazgo_ids = [
        h.id for h in Hallazgo.query.filter_by(upload_id=upload_id).with_entities(Hallazgo.id)
    ]
    if hallazgo_ids:
        Notificacition.query.filter(
            Notificacition.hallazgo_id.in_(hallazgo_ids)
        ).delete(synchronize_session=False)
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

    # Detectar cuántos serían upsert (ya existen en BD)
    codigos_excel = [h.get("codigo_del_hallazgo") for h in hallazgos if h.get("codigo_del_hallazgo")]
    existentes = (
        Hallazgo.query.filter(Hallazgo.codigo_del_hallazgo.in_(codigos_excel)).count()
        if codigos_excel else 0
    )

    dep_sorted = sorted(por_dependencia.items(), key=lambda x: x[1], reverse=True)[:10]
    resp_sorted = sorted(por_responsable.items(), key=lambda x: x[1], reverse=True)[:10]
    estado_sorted = sorted(por_estado.items(), key=lambda x: x[1], reverse=True)

    return {
        "total": len(hallazgos),
        "total_actividades": len(actividades_data),
        "nuevos": len(hallazgos) - existentes,
        "actualizaciones": existentes,
        "vencidos": vencidos,
        "con_prorroga": con_prorroga,
        "por_estado": [{"estado": k, "total": v} for k, v in estado_sorted],
        "por_dependencia": [{"nombre": k, "total": v} for k, v in dep_sorted],
        "por_responsable": [{"nombre": k, "total": v} for k, v in resp_sorted],
        "errores": errors[:20],
    }, None
