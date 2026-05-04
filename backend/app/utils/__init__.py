import unicodedata


def strip_accents(text: str) -> str:
    """Elimina tildes/diacríticos para comparaciones tolerantes ('Peña' → 'Pena')."""
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
