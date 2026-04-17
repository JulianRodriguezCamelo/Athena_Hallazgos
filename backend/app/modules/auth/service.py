from app.models.user import User


def find_by_email(email: str):
    return User.query.filter_by(email=email.lower().strip()).first()


def find_by_id(user_id):
    return User.query.get(int(user_id))
