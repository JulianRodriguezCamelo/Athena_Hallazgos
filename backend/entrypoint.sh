#!/bin/sh
set -e

echo "[entrypoint] Verificando estado de la base de datos..."
FLASK_SKIP_DB_INIT=1 python /app/db_check.py

echo "[entrypoint] Aplicando migraciones de base de datos..."
FLASK_SKIP_DB_INIT=1 flask db upgrade

echo "[entrypoint] Iniciando Gunicorn..."
exec env FLASK_SKIP_DB_INIT=1 gunicorn \
  --worker-class eventlet \
  --workers 8 \
  --timeout 300 \
  --graceful-timeout 30 \
  --keep-alive 5 \
  --bind 0.0.0.0:5000 \
  wsgi:app
