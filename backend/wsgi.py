import os
from dotenv import load_dotenv
load_dotenv()
from app import create_app
from app.extensions import socketio

env = os.environ.get("FLASK_ENV", "development")
app = create_app(env)
