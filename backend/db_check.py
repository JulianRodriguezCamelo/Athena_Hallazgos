"""
Verifica el estado de la BD antes de las migraciones.
Si las tablas ya existen pero Alembic no las conoce, las marca como aplicadas.
"""
import os
os.environ.setdefault("FLASK_SKIP_DB_INIT", "1")

from sqlalchemy import inspect, text
from app import create_app
from app.extensions import db

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    existing_tables = inspector.get_table_names()

    has_schema = "users" in existing_tables
    has_alembic = "alembic_version" in existing_tables

    if has_schema and not has_alembic:
        print("[db_check] Esquema existente detectado sin tracking de Alembic.")
        print("[db_check] Estampando revisión actual para evitar re-aplicar migraciones...")
        from flask_migrate import stamp
        stamp()
        print("[db_check] Hecho.")
    elif has_schema and has_alembic:
        print("[db_check] Base de datos con Alembic activo. Continuando normalmente.")
    else:
        print("[db_check] Base de datos vacía. Las migraciones crearán el esquema.")
