import re
from datetime import datetime
import pandas as pd


COLUMN_MAP = {
    r"c[oó]digo.*evento":              "codigo_del_hallazgo",
    r"^num(ero)?$":                    "codigo_del_hallazgo",

    r"descripcion.*hechos|descripcionhechos": "descripcion",
    r"^descripci[oó]n$":               "descripcion",

    r"vicepresidencia":                "vicepresidencia",
    r"^vp$":                           "vicepresidencia",

    r"dependencia":                    "dependencia_reporta_ero",
    r"proceso":                        "direccion",
    r"^area$":                         "vicepresidencia",

    r"fecha.*hallazgo":                "fecha_inicial_evento",
    r"fecha.*inicial.*evento":         "fecha_inicial_evento",
    r"fecha.*finalizaci[oó]n.*evento": "fecha_finalizacion_evento",
    r"fecha.*cierre.*proyectada":      "fecha_cierre_proyectada",
    r"fecha.*compromiso":              "fecha_cierre_proyectada",
    r"^fechacierre$|fecha.*cierre$":   "fecha_finalizacion_evento",
    r"fecha.*seguimiento":             "fecha_cierre_final_prorroga",
    r"fecha.*cierre.*pr[oó]rroga":     "fecha_cierre_final_prorroga",

    r"^estado$":                       "estado",

    r"reportado.*para":                "reportado_para",
    r"enviar.*a":                      "reportado_para",
    r"^fuente$":                       "reportado_para",
    r"reportado.*por":                 "reportado_por",
    r"^responsable$":                  "responsable_plan_accion",

    r"aplicativo.*afecta.*ero":        "aplicativo_afecta_ero",
    r"sistema.*gesti[oó]n":            "aplicativo_afecta_ero",

    r"descripci[oó]n.*plan.*acci[oó]n": "descripcion_plan_accion",
    r"^actividad$":                    "descripcion_plan_accion",
    r"estado.*plan.*acci[oó]n":        "estado_plan_accion",
    r"^eficacia.*global$":             "estado_plan_accion",
    r"^eficaz(ia)?$":                  "estado_accion",
    r"estado.*acci[oó]n":              "estado_accion",
    r"responsable.*acci[oó]n":         "responsable_accion",

    r"pr[oó]rroga$":                   "prorroga",

    r"observaci[oó]n|observaciones":   "observaciones",
    r"^seguimiento$":                  "observaciones",
    r"causa.*raiz":                    "observaciones",
}

DATE_FIELDS = {
    "fecha_inicial_evento",
    "fecha_finalizacion_evento",
    "fecha_cierre_proyectada",
    "fecha_cierre_final_prorroga",
}

HALLAZGO_FIELDS = {
    "codigo_del_hallazgo", "descripcion", "vicepresidencia",
    "dependencia_reporta_ero", "direccion", "fecha_inicial_evento",
    "fecha_finalizacion_evento", "estado", "reportado_para",
    "reportado_por", "aplicativo_afecta_ero",
}


def _normalize(col: str) -> str:
    return str(col).strip().lower()


def _map_columns(df_columns: list) -> dict:
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
        "%d-%b-%y %H.%M.%S",
        "%d-%b-%y",
        "%d-%b-%Y %H.%M.%S",
        "%d-%b-%Y",
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
    s = str(value).replace("\r", "").strip()
    return s if s and s.lower() not in ("nan", "none", "nat") else None


def _record_to_actividad(record: dict, codigo_del_hallazgo: str | None, orden: int = 1) -> dict:
    return {
        "codigo_del_hallazgo": codigo_del_hallazgo,
        "orden": orden,
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


def _actividad_tiene_datos(act: dict) -> bool:
    campos = {
        "descripcion", "estado_plan_accion", "responsable",
        "estado_accion", "responsable_accion", "fecha_compromiso", "observaciones",
    }
    return any(act.get(c) for c in campos)


def _is_header_like(row: pd.Series) -> bool:
    vals = [str(v).strip() for v in row if str(v).strip()]
    if not vals:
        return False
    numeric_count = sum(
        1 for v in vals
        if v.replace(".", "").replace("-", "").replace("/", "").isdigit()
    )
    return numeric_count < len(vals) * 0.5


def _read_all_sheets(file_path: str) -> tuple[pd.DataFrame | None, str | None]:
    try:
        sheets: dict = pd.read_excel(file_path, dtype=str, header=None, sheet_name=None)
    except Exception as e:
        return None, f"No se pudo leer el archivo: {str(e)}"

    frames: list[pd.DataFrame] = []
    for sheet_name, df_sheet in sheets.items():
        if df_sheet.empty:
            continue
        df_sheet = df_sheet.dropna(how="all").reset_index(drop=True)
        if len(df_sheet) < 2:
            continue

        row0 = df_sheet.iloc[0].fillna("")
        row1 = df_sheet.iloc[1].fillna("")

        if _is_header_like(row1):
            combined_headers = []
            for c0, c1 in zip(row0, row1):
                c0s = str(c0).strip()
                c1s = str(c1).strip()
                if c0s and not c0s.startswith("Unnamed"):
                    combined_headers.append(c0s)
                elif c1s and not c1s.startswith("Unnamed"):
                    combined_headers.append(c1s)
                else:
                    combined_headers.append(c0s or c1s or "")
            df_sheet.columns = combined_headers
            df_sheet = df_sheet.iloc[2:].reset_index(drop=True)
        else:
            df_sheet.columns = [str(c).strip() for c in row0]
            df_sheet = df_sheet.iloc[1:].reset_index(drop=True)

        df_sheet = df_sheet.dropna(how="all")
        frames.append(df_sheet)

    if not frames:
        return None, "El archivo no contiene hojas con datos."

    df_all = pd.concat(frames, ignore_index=True, sort=False)
    return df_all, None


def parse_excel(file_path: str) -> tuple[list[dict], list[tuple[int, dict]], list[str]]:
    df, read_error = _read_all_sheets(file_path)
    if read_error:
        return [], [], [read_error]

    col_mapping = _map_columns(list(df.columns))

    if not col_mapping:
        return [], [], [
            "No se reconocieron columnas válidas en el archivo. "
            "Verifique que la primera fila contenga los encabezados."
        ]

    hallazgo_cols = [col for col, field in col_mapping.items() if field in HALLAZGO_FIELDS]
    for col in hallazgo_cols:
        last_val = None
        for idx in df.index:
            val = _clean(df.at[idx, col])
            if val is not None:
                last_val = val
            elif last_val is not None:
                df.at[idx, col] = last_val

    hallazgos: list[dict] = []
    actividades_data: list[tuple[int, dict]] = []
    seen_codigos: dict[str, int] = {}
    errors: list[str] = []

    for idx, row in df.iterrows():
        row_num = int(idx) + 2
        try:
            record: dict = {}
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

            if not any(v for v in record.values() if v is not None):
                continue

            codigo = record.get("codigo_del_hallazgo")
            group_key = codigo if codigo else record.get("descripcion")

            if not group_key:
                continue

            if group_key not in seen_codigos:
                hallazgo_idx = len(hallazgos)
                seen_codigos[group_key] = hallazgo_idx
                hallazgos.append(record)
            else:
                hallazgo_idx = seen_codigos[group_key]

            orden = sum(1 for h_idx, _ in actividades_data if h_idx == hallazgo_idx) + 1
            act = _record_to_actividad(record, codigo or group_key, orden)
            if _actividad_tiene_datos(act):
                actividades_data.append((hallazgo_idx, act))

        except Exception as e:
            errors.append(f"Fila {row_num}: {str(e)}")

    return hallazgos, actividades_data, errors
