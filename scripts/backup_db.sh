#!/bin/sh
# Backup automático de Oracle XE 21c con Data Pump (expdp)
# Uso: ./scripts/backup_db.sh
# Requisito: variables DB_* definidas en el entorno o .env
# Prerrequisito Oracle: el directorio lógico BACKUP_DIR debe existir en el servidor:
#   CREATE OR REPLACE DIRECTORY backup_dir AS '/backups';
#   GRANT READ, WRITE ON DIRECTORY backup_dir TO <DB_USER>;

set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMPFILE="hallazgos_${TIMESTAMP}.dmp"
LOGFILE="hallazgos_${TIMESTAMP}.log"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-1521}"
DB_SERVICE="${DB_SERVICE:-XEPDB1}"
DB_USER="${DB_USER:-hallazgos}"
DB_PASSWORD="${DB_PASSWORD}"

mkdir -p "$BACKUP_DIR"

echo "[backup] Iniciando backup Oracle: ${BACKUP_DIR}/${DUMPFILE}"

expdp "${DB_USER}/${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_SERVICE}" \
  schemas="${DB_USER}" \
  dumpfile="${DUMPFILE}" \
  logfile="${LOGFILE}" \
  directory=BACKUP_DIR

# Comprimir el dump
gzip "${BACKUP_DIR}/${DUMPFILE}"

echo "[backup] Backup completado: ${BACKUP_DIR}/${DUMPFILE}.gz"

# Eliminar backups más viejos que RETENTION_DAYS días
find "$BACKUP_DIR" -name "hallazgos_*.dmp.gz" -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -name "hallazgos_*.log" -mtime "+${RETENTION_DAYS}" -delete
echo "[backup] Limpieza completada — backups más viejos de ${RETENTION_DAYS} días eliminados"
