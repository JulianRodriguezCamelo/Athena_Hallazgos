import re
from datetime import datetime
from collections import defaultdict
import pandas as pd


# Mapeo flexible: patrón (regex sobre nombre de columna normalizado) -> campo del modelo
COLUMN_MAP = {
    # ── Identificación ────────────────────────────────────────────────────────
    r"c[oó]digo.*evento":              "codigo_evento",
    r"^num(ero)?$":                    "codigo_evento",       # columna "Num"

    # ── Descripción / tipo ────────────────────────────────────────────────────
    r"^descripci[oó]n$":               "descripcion",
    r"^tipo$":                         "descripcion",         # columna "Tipo" → descripcion

    # ── Vicepresidencia ───────────────────────────────────────────────────────
    r"vicepresidencia":                "vicepresidencia",
    r"^vp$":                           "vicepresidencia",

    # ── Proceso / dependencia ─────────────────────────────────────────────────
    r"dependencia":                    "dependencia_reporta_ero",
    r"proceso":                        "dependencia_reporta_ero",  # columna "Proceso"

    # ── Fechas ────────────────────────────────────────────────────────────────
    r"fecha.*hallazgo":                "fecha_inicial_evento",
    r"fecha.*inicial.*evento":         "fecha_inicial_evento",
    r"fecha.*finalizaci[oó]n.*evento": "fecha_finalizacion_evento",
    r"fecha.*cierre.*proyectada":      "fecha_cierre_proyectada",
    r"fecha.*compromiso":              "fecha_cierre_proyectada",  # "Fecha Compromiso"
    r"fecha.*cierre$":                 "fecha_finalizacion_evento",
    r"fecha.*seguimiento":             "fecha_cierre_final_prorroga",
    r"fecha.*cierre.*pr[oó]rroga":     "fecha_cierre_final_prorroga",

    # ── Estado ────────────────────────────────────────────────────────────────
    r"^estado$":                       "estado",

    # ── Personas ──────────────────────────────────────────────────────────────
    r"reportado.*para":                "reportado_para",
    r"enviar.*a":                      "reportado_para",       # "Enviar A"
    r"reportado.*por":                 "reportado_por",
    r"^fuente$":                       "reportado_por",        # "Fuente"
    r"^responsable$":                  "responsable_plan_accion",

    # ── Aplicativo / sistema ──────────────────────────────────────────────────
    r"aplicativo.*afecta.*ero":        "aplicativo_afecta_ero",
    r"sistema.*gesti[oó]n":            "aplicativo_afecta_ero",  # "Sistema Gestión"

    # ── Plan de acción ────────────────────────────────────────────────────────
    r"id.*plan.*acci[oó]n":            "id_plan_accion",
    r"nombre.*plan.*acci[oó]n":        "nombre_plan_accion",
    r"descripci[oó]n.*plan.*acci[oó]n":"descripcion_plan_accion",
    r"^actividad$":                    "descripcion_plan_accion",  # "Actividad"
    r"estado.*plan.*acci[oó]n":        "estado_plan_accion",
    r"^eficacia.*global$":             "estado_plan_accion",   # "Eficacia Global"
    r"^eficacia$":                     "estado_accion",        # "Eficacia"
    r"estado.*acci[oó]n":              "estado_accion",
    r"responsable.*acci[oó]n":         "responsable_accion",

    # ── Prórroga ──────────────────────────────────────────────────────────────
    r"pr[oó]rroga$":                   "prorroga",

    # ── Observaciones ─────────────────────────────────────────────────────────
    r"observaci[oó]n|observaciones":   "observaciones",
    r"^seguimiento$":                  "observaciones",        # "Seguimiento"
    r"causa.*raiz":                    "observaciones",        # "Causa Raiz"
    r"^indicador$":                    "observaciones",        # "Indicador"
}

DATE_FIELDS = {
    "fecha_inicial_evento",
    "fecha_finalizacion_evento",
    "fecha_cierre_proyectada",
    "fecha_cierre_final_prorroga",
}

# Campos de la actividad (tomados del record parseado)
ACTIVIDAD_FIELDS = {
    "id_plan_accion",
    "nombre_plan_accion",
    "descripcion_plan_accion",
    "estado_plan_accion",
    "responsable_plan_accion",
    "estado_accion",
    "responsable_accion",
    "fecha_cierre_proyectada",
    "prorroga",
    "fecha_cierre_final_prorroga",
    "observaciones",
}


def _normalize(col: str) -> str:
    return str(col).strip().lower()


def _map_columns(df_columns: list) -> dict:
    """Retorna {columna_excel: campo_modelo} respetando prioridad (primer match gana)."""
    mapping: dict[str, str] = {}
    used_fields: set[str] = set()
    for col in df_columns:
        col_norm = _normalize(col)
        for pattern, field in COLUMN_MAP.items():
            if re.search(pattern, col_norm) and field not in used_fields:
                mapping[col] = field
                used_fields.add(field)
                break
    return mapping


def _parse_date(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    s = str(value).strip()
    if not s or s.lower() in ("nan", "none", "nat", ""):
        return None
    formats = [
        "%d/%m/%Y %H:%M", "%d/%m/%Y", "%d-%m-%Y",
        "%Y-%m-%d %H:%M:%S", "%Y-%m-%d",
        "%d/%m/%y", "%m/%d/%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _clean(value) -> str | None:
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    s = str(value).strip()
    return s if s and s.lower() not in ("nan", "none", "nat") else None


def _is_data_row(row: pd.Series, col_mapping: dict) -> bool:
    """Retorna False si la fila es una fila de sub-encabezado (>80% valores nulos)."""
    values = [row.get(col) for col in col_mapping]
    non_null = sum(1 for v in values if _clean(v) is not None)
    return non_null > max(1, len(values) * 0.2)


def _record_to_actividad(record: dict, codigo_evento: str | None) -> dict:
    """Convierte un record de Excel en un dict de actividad."""
    return {
        "codigo_evento": codigo_evento,
        "id_plan_accion": record.get("id_plan_accion"),
        "nombre_plan_accion": record.get("nombre_plan_accion"),
        "descripcion": record.get("descripcion_plan_accion"),
        "estado_plan_accion": record.get("estado_plan_accion"),
        "responsable": record.get("responsable_plan_accion"),
        "estado_accion": record.get("estado_accion"),
        "responsable_accion": record.get("responsable_accion"),
        "fecha_compromiso": record.get("fecha_cierre_proyectada"),
        "prorroga": record.get("prorroga"),
        "fecha_prorroga": record.get("fecha_cierre_final_prorroga"),
        "observaciones": record.get("observaciones"),
    }


def parse_excel(file_path: str) -> tuple[list[dict], list[dict], list[str]]:
    """
    Parsea el archivo Excel.
    Retorna (hallazgos, actividades, errores).
    - Agrupa filas por codigo_evento.
    - La primera fila de cada grupo = hallazgo.
    - Las filas adicionales del mismo codigo_evento = actividades.
    - Filas sin codigo_evento: cada una es un hallazgo independiente.
    """
    try:
        df = pd.read_excel(file_path, dtype=str, header=0)
    except Exception as e:
        return [], [], [f"No se pudo leer el archivo: {str(e)}"]

    # Limpiar filas y columnas completamente vacías
    df = df.dropna(how="all").reset_index(drop=True)
    df = df.loc[:, df.columns.notna()]
    df.columns = [str(c) for c in df.columns]

    col_mapping = _map_columns(list(df.columns))

    if not col_mapping:
        return [], [], [
            "No se reconocieron columnas válidas en el archivo. "
            "Verifique que la primera fila contenga los encabezados."
        ]

    # Parsear todas las filas a records planos
    flat_records: list[tuple[int, dict]] = []  # (row_num, record)
    errors: list[str] = []

    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # +2: encabezado + índice base 0

        if not _is_data_row(row, col_mapping):
            continue

        record: dict = {}
        try:
            for excel_col, model_field in col_mapping.items():
                raw = row.get(excel_col)
                if model_field in DATE_FIELDS:
                    record[model_field] = _parse_date(raw)
                else:
                    val = _clean(raw)
                    if model_field in record and record[model_field] and val:
                        record[model_field] = f"{record[model_field]} | {val}"
                    else:
                        record[model_field] = val
            flat_records.append((row_num, record))
        except Exception as e:
            errors.append(f"Fila {row_num}: {str(e)}")

    # Agrupar por codigo_evento
    # Orden preservado: dict en Python 3.7+
    groups: dict[str, list[dict]] = {}  # codigo_evento -> [records]
    no_code_records: list[dict] = []    # filas sin codigo_evento

    for _row_num, record in flat_records:
        codigo = record.get("codigo_evento")
        if not codigo:
            no_code_records.append(record)
        else:
            if codigo not in groups:
                groups[codigo] = []
            groups[codigo].append(record)

    hallazgos: list[dict] = []
    actividades_data: list[tuple[str, dict]] = []  # (codigo_evento, actividad_dict)

    # Grupos con codigo_evento: primer registro = hallazgo, resto = actividades
    for codigo, records in groups.items():
        hallazgos.append(records[0])
        for extra in records[1:]:
            actividades_data.append((codigo, _record_to_actividad(extra, codigo)))

    # Filas sin codigo_evento: cada una es hallazgo independiente
    hallazgos.extend(no_code_records)

    return hallazgos, actividades_data, errors
