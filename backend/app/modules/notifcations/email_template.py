from datetime import date


def build_email_html(
    user_name: str,
    type: str,
    title: str,
    message: str,
    hallazgo_id: int,
    fecha: str = None,
    prioridad: str = None,
    area: str = None,
    dashboard_url: str = "https://athena.fiduprevisora.com/dashboard/hallazgos",
) -> str:
    fecha = fecha or date.today().strftime("%d %b %Y")
    url = f"{dashboard_url}/{hallazgo_id}"

    prioridad_color = (
        "#e53935" if prioridad and prioridad.lower() == "alta" else
        "#43a047" if prioridad and prioridad.lower() == "baja" else
        "#1e88e5"
    )

    meta_cols = f"""
    <td style="padding-right:40px;">
      <div style="color:#94a3b8;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px;">Fecha</div>
      <div style="color:#e2e8f0;font-size:13px;font-weight:500;">{fecha}</div>
    </td>"""
    if prioridad:
        meta_cols += f"""
    <td style="padding-right:40px;">
      <div style="color:#94a3b8;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px;">Prioridad</div>
      <div style="color:{prioridad_color};font-size:13px;font-weight:600;">{prioridad.upper()}</div>
    </td>"""
    if area:
        meta_cols += f"""
    <td>
      <div style="color:#94a3b8;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px;">Área</div>
      <div style="color:#e2e8f0;font-size:13px;font-weight:500;">{area}</div>
    </td>"""

    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>{title}</title></head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
  {_header()}
  <tr><td style="padding:0 0 28px;">
    <div style="color:#f8fafc;font-size:24px;font-weight:700;line-height:1.3;">Hola, <span style="color:#f97316;">{user_name}</span></div>
    <div style="color:#64748b;font-size:14px;margin-top:8px;line-height:1.5;">Tienes una nueva notificación en la plataforma de gestión de riesgos.</div>
  </td></tr>
  <tr><td style="padding-bottom:28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#161b22;border:1px solid #21262d;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:4px 0 0;background:linear-gradient(90deg,#f97316,#ea580c);border-radius:12px 12px 0 0;height:3px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:28px 32px;">
        <div style="margin-bottom:18px;">
          <span style="background:#f9731615;border:1px solid #f9731640;color:#f97316;font-size:10px;font-weight:700;letter-spacing:1.5px;padding:5px 14px;border-radius:20px;text-transform:uppercase;">{type}</span>
        </div>
        <div style="color:#f1f5f9;font-size:18px;font-weight:700;margin-bottom:12px;line-height:1.4;">{title}</div>
        <div style="color:#94a3b8;font-size:14px;line-height:1.7;padding-bottom:22px;border-bottom:1px solid #21262d;">{message}</div>
        <table cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr>{meta_cols}</tr></table>
      </td></tr>
    </table>
  </td></tr>
  {_cta(url)}
  {_footer()}
</table>
</td></tr>
</table>
</body>
</html>"""


def build_bienvenida_html(user_name: str, email: str, rol: str, password_temporal: str = None) -> str:
    rol_label = {"vicepresidente": "Vicepresidente", "directivo": "Directivo", "gestor": "Gestor", "profesional": "Profesional"}.get(rol, rol.capitalize())
    dashboard_url = "https://athena.fiduprevisora.com/dashboard"

    password_block = ""
    if password_temporal:
        password_block = f"""
    <tr><td style="padding-top:20px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#1c1917;border:1px solid #f9731630;border-radius:10px;">
        <tr><td style="padding:3px 0 0;background:#f97316;border-radius:10px 10px 0 0;height:3px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:20px 24px;">
          <div style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">Contraseña temporal</div>
          <div style="color:#f8fafc;font-size:22px;font-weight:700;letter-spacing:4px;font-family:'Courier New',monospace;background:#0d1117;padding:12px 16px;border-radius:6px;display:inline-block;">{password_temporal}</div>
          <div style="color:#64748b;font-size:12px;margin-top:12px;">Cámbiala en tu primer inicio de sesión.</div>
        </td></tr>
      </table>
    </td></tr>"""

    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>Bienvenido a Athena</title></head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
  {_header()}
  <tr><td style="padding:0 0 28px;">
    <div style="color:#f8fafc;font-size:24px;font-weight:700;line-height:1.3;">Bienvenido, <span style="color:#f97316;">{user_name}</span></div>
    <div style="color:#64748b;font-size:14px;margin-top:8px;line-height:1.5;">Tu cuenta en la plataforma de gestión de riesgos ha sido creada exitosamente.</div>
  </td></tr>
  <tr><td style="padding-bottom:28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#161b22;border:1px solid #21262d;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:4px 0 0;background:#f97316;border-radius:12px 12px 0 0;height:3px;font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:28px 32px;">
        <div style="color:#f1f5f9;font-size:15px;font-weight:700;margin-bottom:22px;letter-spacing:0.3px;">Datos de acceso</div>
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr><td style="padding-bottom:18px;border-bottom:1px solid #21262d;">
            <div style="color:#64748b;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Correo electrónico</div>
            <div style="color:#f97316;font-size:14px;font-weight:500;">{email}</div>
          </td></tr>
          <tr><td style="padding-top:18px;">
            <div style="color:#64748b;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Rol asignado</div>
            <div style="display:inline-block;background:#f9731615;border:1px solid #f9731640;color:#f97316;font-size:12px;font-weight:700;letter-spacing:1px;padding:5px 14px;border-radius:20px;text-transform:uppercase;">{rol_label}</div>
          </td></tr>
          {password_block}
        </table>
      </td></tr>
    </table>
  </td></tr>
  {_cta(dashboard_url, label="Ir a la plataforma")}
  {_footer()}
</table>
</td></tr>
</table>
</body>
</html>"""


def build_resumen_semanal_html(
    user_name: str,
    rol: str,
    hallazgos_proximos: list,
    actividades_proximas: list,
    stats: dict,
) -> str:
    rol_label = {"vicepresidente": "Vicepresidente", "directivo": "Directivo", "gestor": "Gestor", "profesional": "Profesional"}.get(rol, rol.capitalize())
    semana = date.today().strftime("%d %b %Y")

    def stat_cell(label, value, color="#f97316"):
        return f"""
        <td align="center" style="padding:20px 16px;">
          <div style="color:{color};font-size:30px;font-weight:800;line-height:1;">{value}</div>
          <div style="color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;margin-top:6px;">{label}</div>
        </td>"""

    stats_row = (
        stat_cell("Total", stats.get("total", 0)) +
        stat_cell("Pendientes", stats.get("pendientes", 0), "#e53935") +
        stat_cell("En Proceso", stats.get("en_proceso", 0), "#1e88e5") +
        stat_cell("Cerrados", stats.get("cerrados", 0), "#43a047")
    )

    def hallazgo_rows(items):
        if not items:
            return '<tr><td colspan="4" style="color:#475569;font-size:13px;padding:20px 0;text-align:center;">Sin hallazgos próximos a vencer</td></tr>'
        rows = ""
        for h in items:
            rows += f"""
            <tr style="border-bottom:1px solid #21262d;">
              <td style="color:#e2e8f0;font-size:12px;padding:12px 8px;font-weight:600;">{h.get("codigo","—")}</td>
              <td style="color:#94a3b8;font-size:12px;padding:12px 8px;max-width:180px;">{h.get("descripcion","")[:60]}{"..." if len(h.get("descripcion","")) > 60 else ""}</td>
              <td style="color:#e53935;font-size:12px;padding:12px 8px;white-space:nowrap;font-weight:500;">{h.get("fecha_cierre","—")}</td>
              <td style="padding:12px 8px;">
                <span style="background:#f9731615;border:1px solid #f9731640;color:#f97316;font-size:10px;font-weight:600;padding:3px 10px;border-radius:10px;letter-spacing:0.5px;">{h.get("estado","—")}</span>
              </td>
            </tr>"""
        return rows

    def actividad_rows(items):
        if not items:
            return '<tr><td colspan="3" style="color:#475569;font-size:13px;padding:20px 0;text-align:center;">Sin actividades próximas a vencer</td></tr>'
        rows = ""
        for a in items:
            rows += f"""
            <tr style="border-bottom:1px solid #21262d;">
              <td style="color:#94a3b8;font-size:12px;padding:12px 8px;max-width:220px;">{a.get("descripcion","")[:70]}{"..." if len(a.get("descripcion","")) > 70 else ""}</td>
              <td style="color:#e2e8f0;font-size:12px;padding:12px 8px;font-weight:500;">{a.get("responsable","—")}</td>
              <td style="color:#e53935;font-size:12px;padding:12px 8px;white-space:nowrap;font-weight:500;">{a.get("fecha_compromiso","—")}</td>
            </tr>"""
        return rows

    dashboard_url = "https://athena.fiduprevisora.com/dashboard"

    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>Resumen Semanal — Athena</title></head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
  {_header()}
  <tr><td style="padding:0 0 28px;">
    <div style="color:#f8fafc;font-size:24px;font-weight:700;line-height:1.3;">Hola, <span style="color:#f97316;">{user_name}</span></div>
    <div style="color:#64748b;font-size:14px;margin-top:8px;line-height:1.5;">
      Resumen semanal &mdash; <strong style="color:#94a3b8;">{semana}</strong>
      &nbsp;&bull;&nbsp; <span style="color:#f97316;">{rol_label}</span>
    </div>
  </td></tr>

  <tr><td style="padding-bottom:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#161b22;border:1px solid #21262d;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:4px 0 0;background:#f97316;height:3px;font-size:0;">&nbsp;</td></tr>
      <tr>{stats_row}</tr>
    </table>
  </td></tr>

  <tr><td style="padding-bottom:24px;">
    <div style="color:#f1f5f9;font-size:14px;font-weight:700;margin-bottom:12px;letter-spacing:0.3px;">Hallazgos próximos a vencer <span style="color:#64748b;font-weight:400;font-size:12px;">(próximos 15 días)</span></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#161b22;border:1px solid #21262d;border-radius:12px;overflow:hidden;">
      <tr style="background:#1e2530;">
        <th style="color:#64748b;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;padding:12px 8px;text-align:left;font-weight:600;">Código</th>
        <th style="color:#64748b;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;padding:12px 8px;text-align:left;font-weight:600;">Descripción</th>
        <th style="color:#64748b;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;padding:12px 8px;text-align:left;font-weight:600;">Vence</th>
        <th style="color:#64748b;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;padding:12px 8px;text-align:left;font-weight:600;">Estado</th>
      </tr>
      {hallazgo_rows(hallazgos_proximos)}
    </table>
  </td></tr>

  <tr><td style="padding-bottom:28px;">
    <div style="color:#f1f5f9;font-size:14px;font-weight:700;margin-bottom:12px;letter-spacing:0.3px;">Actividades próximas a vencer <span style="color:#64748b;font-weight:400;font-size:12px;">(próximos 15 días)</span></div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#161b22;border:1px solid #21262d;border-radius:12px;overflow:hidden;">
      <tr style="background:#1e2530;">
        <th style="color:#64748b;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;padding:12px 8px;text-align:left;font-weight:600;">Actividad</th>
        <th style="color:#64748b;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;padding:12px 8px;text-align:left;font-weight:600;">Responsable</th>
        <th style="color:#64748b;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;padding:12px 8px;text-align:left;font-weight:600;">Vence</th>
      </tr>
      {actividad_rows(actividades_proximas)}
    </table>
  </td></tr>

  {_cta(dashboard_url, label="Ver Dashboard completo")}
  {_footer()}
</table>
</td></tr>
</table>
</body>
</html>"""


# ── Bloques compartidos ──────────────────────────────────────────────────────

def _header() -> str:
    return """
  <tr><td style="padding-bottom:32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <div style="color:#f8fafc;font-size:20px;font-weight:800;letter-spacing:0.5px;">ATHENA</div>
          <div style="color:#475569;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-top:2px;">Fiduprevisora &mdash; Gestión de Riesgos</div>
        </td>
        <td align="right" style="vertical-align:middle;">
          <span style="border:1px solid #f9731650;color:#f97316;font-size:10px;font-weight:700;letter-spacing:1.5px;padding:6px 16px;border-radius:20px;text-transform:uppercase;">Notificación</span>
        </td>
      </tr>
    </table>
    <div style="border-bottom:1px solid #21262d;margin-top:20px;"></div>
  </td></tr>"""


def _cta(url: str, label: str = "Ver en Dashboard") -> str:
    return f"""
  <tr><td align="center" style="padding-bottom:14px;">
    <a href="{url}" style="background:#f97316;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 44px;border-radius:8px;display:inline-block;letter-spacing:0.5px;">{label}</a>
  </td></tr>
  <tr><td align="center" style="padding-bottom:36px;">
    <div style="color:#475569;font-size:11px;margin-bottom:6px;">O copia y pega este enlace:</div>
    <a href="{url}" style="color:#f97316;font-size:11px;word-break:break-all;text-decoration:none;">{url}</a>
  </td></tr>"""


def _footer() -> str:
    return """
  <tr><td style="border-top:1px solid #21262d;padding-top:24px;padding-bottom:8px;">
    <div style="color:#334155;font-size:11px;text-align:center;line-height:1.7;">
      Este correo fue generado automáticamente por <strong style="color:#475569;">Athena &mdash; Fiduprevisora</strong>.<br/>
      Por favor no respondas a este mensaje.
    </div>
  </td></tr>"""
