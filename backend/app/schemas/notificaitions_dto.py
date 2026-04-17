from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class NotificacitionDto:
    id: int
    user_id: int
    hallazgo_id: int
    title: str
    message: str
    read: bool
    created_at: datetime
    type: str
    email_sent: Optional[bool] = False

    @classmethod
    def from_model(cls, n) -> "NotificacitionDto":
        return cls(
            id=n.id,
            user_id=n.user_id,
            hallazgo_id=n.hallazgo_id,
            title=n.title,
            message=n.message,
            read=n.read,
            created_at=n.created_at,
            type=n.type,
            email_sent=n.email_sent,
        )