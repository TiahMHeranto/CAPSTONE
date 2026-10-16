"""Découpage des textes du corpus. Aucun appel réseau."""


def decouper(texte: str, taille: int = 900, chevauchement: int = 120) -> list[str]:
    propre = " ".join(texte.split())
    if not propre:
        return []
    morceaux: list[str] = []
    debut = 0
    while debut < len(propre):
        fin = min(len(propre), debut + taille)
        morceau = propre[debut:fin].strip()
        if morceau:
            morceaux.append(morceau)
        if fin == len(propre):
            break
        debut = max(fin - chevauchement, debut + 1)
    return morceaux


def contrat_de(nom: str) -> str | None:
    titre = nom.rsplit(".", 1)[0]
    if titre.startswith("CP_CTR-"):
        return titre.removeprefix("CP_")
    return None
