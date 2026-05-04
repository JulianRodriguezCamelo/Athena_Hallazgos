import logging
from flask_socketio import join_room, disconnect
from flask_jwt_extended import decode_token

logger = logging.getLogger(__name__)


def register_handlers(socketio):

    @socketio.on("connect")
    def handle_connect(auth):
        if not auth or "token" not in auth:
            disconnect()
            return
        try:
            decoded = decode_token(auth["token"])
            user_id = decoded["sub"]
            join_room(f"user_{user_id}")
        except Exception as e:
            logger.warning("Conexión SocketIO rechazada — token inválido: %s", e)
            disconnect()

    @socketio.on("disconnect")
    def handle_disconnect():
        pass
