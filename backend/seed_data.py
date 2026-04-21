"""
Script para poblar la base de datos con usuarios de prueba.
Ejecutar: python seed_data.py
"""
from app import create_app
from app.extensions import db
from app.models.user import User

app = create_app("development")

USERS = [
    {
        "nombre": "Vicepresidenta Ejecutiva",
        "email": "vice@fiduprevisora.com",
        "password": "Vice2025*",
        "rol": "vicepresidente",
        "dependencia": "Vicepresidencia",
    },
    {
        "nombre": "Director Tecnología",
        "email": "dir.tecnologia@fiduprevisora.com",
        "password": "Dir2025*",
        "rol": "directivo",
        "dependencia": "Tecnología",
    },
    {
        "nombre": "Director Infraestructura",
        "email": "dir.infraestructura@fiduprevisora.com",
        "password": "Dir2025*",
        "rol": "directivo",
        "dependencia": "Infraestructura",
    },
    {
        "nombre": "Director Software",
        "email": "dir.software@fiduprevisora.com",
        "password": "Dir2025*",
        "rol": "directivo",
        "dependencia": "Software",
    },
    {
        "nombre": "Técnico Juan García",
        "email": "j.garcia@fiduprevisora.com",
        "password": "Tec2025*",
        "rol": "profesional",
        "dependencia": "Tecnología",
    },
    {
        "nombre": "Técnica María Rodríguez",
        "email": "m.rodriguez@fiduprevisora.com",
        "password": "Tec2025*",
        "rol": "profesional",
        "dependencia": "Software",
    },
]

with app.app_context():
    for u_data in USERS:
        if not User.query.filter_by(email=u_data["email"]).first():
            user = User(
                nombre=u_data["nombre"],
                email=u_data["email"],
                rol=u_data["rol"],
                dependencia=u_data["dependencia"],
                activo=True,
            )
            user.set_password(u_data["password"])
            db.session.add(user)
            print(f"  Creado: {u_data['email']} [{u_data['rol']}]")
        else:
            print(f"  Ya existe: {u_data['email']}")

    db.session.commit()
    print("\nSeed completado.")
