from datetime import datetime, timezone
from app.extensions import db


class UserPreferences(db.Model):
    __tablename__ = "user_preferences"

    id               = db.Column(db.Integer, primary_key=True)
    user_id          = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    dashboard_layout = db.Column(db.Text, nullable=True)
    updated_at       = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = db.relationship(
        "User",
        backref=db.backref("preferences", uselist=False, cascade="all, delete-orphan"),
    )
