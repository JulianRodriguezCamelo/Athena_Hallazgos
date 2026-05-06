# ARCHIVO DUPLICADO — NO USAR
# Los handlers de WebSocket están en app/sockets.py (con 's')
# Este archivo existe por error histórico y se mantiene solo por compatibilidad
# de importaciones antiguas. No agregar código aquí.

from app.sockets import register_handlers  # noqa: F401 — re-export para compat
