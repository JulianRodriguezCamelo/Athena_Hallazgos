"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-25

"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nombre", sa.String(120), nullable=False),
        sa.Column("email", sa.String(120), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(256), nullable=False),
        sa.Column("rol", sa.String(50), nullable=False, server_default="profesional"),
        sa.Column("vicepresidencia", sa.String(200), nullable=True),
        sa.Column("dependencia", sa.String(120), nullable=True),
        sa.Column("activo", sa.Integer(), server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("SYSDATE")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("SYSDATE")),
        sa.CheckConstraint(
            "rol IN ('vicepresidente','directivo','profesional','gestor','administrador')",
            name="ck_users_rol",
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # --- upload_history ---
    op.create_table(
        "upload_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("filename_original", sa.String(300), nullable=False),
        sa.Column("filename_stored", sa.String(300), nullable=False),
        sa.Column("uploaded_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("total_registros", sa.Integer(), server_default="0"),
        sa.Column("registros_exitosos", sa.Integer(), server_default="0"),
        sa.Column("registros_fallidos", sa.Integer(), server_default="0"),
        sa.Column("estado", sa.String(20), server_default="procesando"),
        sa.Column("errores", sa.Text(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(), server_default=sa.text("SYSDATE")),
        sa.CheckConstraint(
            "estado IN ('procesando','completado','error')",
            name="ck_upload_estado",
        ),
    )
    op.create_index("ix_upload_history_uploaded_by_id", "upload_history", ["uploaded_by_id"])

    # --- hallazgos ---
    op.create_table(
        "hallazgos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("codigo_del_hallazgo", sa.Text(), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("fecha_inicial_evento", sa.DateTime(), nullable=True),
        sa.Column("fecha_finalizacion_evento", sa.DateTime(), nullable=True),
        sa.Column("vicepresidencia", sa.String(200), nullable=True),
        sa.Column("direccion", sa.String(200), nullable=True),
        sa.Column("dependencia_reporta_ero", sa.String(200), nullable=True),
        sa.Column("reportado_para", sa.String(200), nullable=True),
        sa.Column("estado", sa.String(100), nullable=True),
        sa.Column("reportado_por", sa.String(200), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("aplicativo_afecta_ero", sa.String(200), nullable=True),
        sa.Column("fecha_cierre_proyectada", sa.DateTime(), nullable=True),
        sa.Column("id_plan_accion", sa.String(100), nullable=True),
        sa.Column("nombre_plan_accion", sa.String(300), nullable=True),
        sa.Column("descripcion_plan_accion", sa.Text(), nullable=True),
        sa.Column("estado_plan_accion", sa.String(100), nullable=True),
        sa.Column("responsable_plan_accion", sa.String(200), nullable=True),
        sa.Column("estado_accion", sa.String(100), nullable=True),
        sa.Column("responsable_accion", sa.String(200), nullable=True),
        sa.Column("prorroga", sa.String(100), nullable=True),
        sa.Column("fecha_cierre_final_prorroga", sa.DateTime(), nullable=True),
        sa.Column("upload_id", sa.Integer(), sa.ForeignKey("upload_history.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("SYSDATE")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("SYSDATE")),
    )
    op.create_index("ix_hallazgos_codigo_del_hallazgo", "hallazgos", ["codigo_del_hallazgo"])
    op.create_index("ix_hallazgos_vicepresidencia", "hallazgos", ["vicepresidencia"])
    op.create_index("ix_hallazgos_direccion", "hallazgos", ["direccion"])
    op.create_index("ix_hallazgos_dependencia_reporta_ero", "hallazgos", ["dependencia_reporta_ero"])
    op.create_index("ix_hallazgos_estado", "hallazgos", ["estado"])
    op.create_index("ix_hallazgos_id_plan_accion", "hallazgos", ["id_plan_accion"])
    op.create_index("ix_hallazgos_estado_plan_accion", "hallazgos", ["estado_plan_accion"])
    op.create_index("ix_hallazgos_responsable_plan_accion", "hallazgos", ["responsable_plan_accion"])
    op.create_index("ix_hallazgos_responsable_accion", "hallazgos", ["responsable_accion"])
    op.create_index("ix_hallazgos_upload_id", "hallazgos", ["upload_id"])

    # --- actividades ---
    op.create_table(
        "actividades",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("hallazgo_id", sa.Integer(), sa.ForeignKey("hallazgos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("codigo_del_hallazgo", sa.Text(), nullable=True),
        sa.Column("orden", sa.Integer(), server_default="0"),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("estado_plan_accion", sa.String(100), nullable=True),
        sa.Column("responsable", sa.String(200), nullable=True),
        sa.Column("estado_accion", sa.String(100), nullable=True),
        sa.Column("responsable_accion", sa.String(200), nullable=True),
        sa.Column("fecha_compromiso", sa.DateTime(), nullable=True),
        sa.Column("prorroga", sa.String(100), nullable=True),
        sa.Column("fecha_prorroga", sa.DateTime(), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("ultima_nota_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("SYSDATE")),
    )
    op.create_index("ix_actividades_hallazgo_id", "actividades", ["hallazgo_id"])
    op.create_index("ix_actividades_codigo_del_hallazgo", "actividades", ["codigo_del_hallazgo"])

    # --- notas_seguimiento ---
    op.create_table(
        "notas_seguimiento",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actividad_id", sa.Integer(), sa.ForeignKey("actividades.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("nota", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSDATE")),
    )
    op.create_index("ix_notas_seguimiento_actividad_id", "notas_seguimiento", ["actividad_id"])

    # --- checklist_items ---
    op.create_table(
        "checklist_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actividad_id", sa.Integer(), sa.ForeignKey("actividades.id", ondelete="CASCADE"), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("completado", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("fecha_completado", sa.DateTime(), nullable=True),
        sa.Column("link_evidencia", sa.Text(), nullable=True),
        sa.Column("completado_por_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("SYSDATE")),
    )
    op.create_index("ix_checklist_items_actividad_id", "checklist_items", ["actividad_id"])

    # --- notificacitions (nombre legacy, no cambiar) ---
    op.create_table(
        "notificacitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("hallazgo_id", sa.Integer(), sa.ForeignKey("hallazgos.id"), nullable=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.String(200), nullable=False),
        sa.Column("read", sa.Integer(), server_default=sa.text("0")),
        sa.Column("email_sent", sa.Integer(), server_default=sa.text("0")),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("SYSDATE")),
        sa.CheckConstraint(
            "type IN ('vencimiento','prorroga','asignacion','actualizacion','alerta')",
            name="ck_notif_type",
        ),
    )

    # --- user_preferences ---
    op.create_table(
        "user_preferences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("dashboard_layout", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("SYSDATE")),
    )
    op.create_index("ix_user_preferences_user_id", "user_preferences", ["user_id"], unique=True)

    # --- token_blocklist ---
    op.create_table(
        "token_blocklist",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("jti", sa.String(36), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("SYSDATE")),
    )
    op.create_index("ix_token_blocklist_jti", "token_blocklist", ["jti"], unique=True)

    # --- audit_log ---
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("changes", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("SYSDATE")),
    )
    op.create_index("ix_audit_log_entity", "audit_log", ["entity_type", "entity_id"])
    op.create_index("ix_audit_log_user", "audit_log", ["user_id"])


def downgrade():
    op.drop_table("audit_log")
    op.drop_table("token_blocklist")
    op.drop_table("user_preferences")
    op.drop_table("notificacitions")
    op.drop_table("checklist_items")
    op.drop_table("notas_seguimiento")
    op.drop_table("actividades")
    op.drop_table("hallazgos")
    op.drop_table("upload_history")
    op.drop_table("users")
