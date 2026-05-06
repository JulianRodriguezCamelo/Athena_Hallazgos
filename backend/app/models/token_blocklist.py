from datetime import datetime, timezone
from app.extensions import db


class TokenBlocklist(db.Model):
    """JTIs de tokens JWT revocados (logout). Se purgan automáticamente al expirar."""
    __tablename__ = "token_blocklist"

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, unique=True, index=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<TokenBlocklist jti={self.jti}>"
