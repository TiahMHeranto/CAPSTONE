"""Vocabulaire de recherche du corpus.

Les synonymes sont ajoutés seulement au texte embarqué. Le texte montré
au modèle reste la question d'origine.
"""

import re
import unicodedata

FORMULES = frozenset({"ESSENTIEL", "CONFORT", "PREMIUM"})

_GROUPES = (
    ("ariary", "mga", "ar", "monnaie", "devise", "unité monétaire", "franc", "argent"),
    (
        "ticket modérateur",
        "reste à charge",
        "part du bénéficiaire",
        "combien je paie",
        "ce que je paie",
        "à ma charge",
        "participation",
    ),
    (
        "carence",
        "délai d'attente",
        "période d'attente",
        "temps d'attente",
        "avant d'être couvert",
        "avant d'être remboursé",
    ),
    ("plafond", "limite", "maximum", "montant maximal", "montant maximum", "remboursé au maximum"),
    ("entente préalable", "accord préalable", "autorisation préalable", "autorisation avant"),
    (
        "attestation de prise en charge",
        "apc",
        "pec",
        "accord de prise en charge",
        "garantie de prise en charge",
    ),
    (
        "tiers payant",
        "sans avancer",
        "dispense d'avance",
        "carte d'assuré",
        "ne pas avancer les frais",
    ),
    ("ordonnance", "prescription", "ordonnance périmée", "validité de l'ordonnance"),
    (
        "bénéficiaire",
        "assuré",
        "adhérent",
        "personne couverte",
        "ayant droit",
        "membre de la famille",
        "qui est couvert",
    ),
    ("conjoint", "époux", "épouse", "mari", "femme", "enfant", "enfants à charge", "famille"),
    (
        "exclusion",
        "exclu",
        "non remboursable",
        "pas couvert",
        "non pris en charge",
        "ce qui n'est pas remboursé",
    ),
    ("fraude", "abus", "falsification", "faux", "tromperie", "contrôle médical"),
    ("réclamation", "contester", "contestation", "recours", "plainte", "litige", "désaccord"),
    ("résiliation", "radiation", "fin du contrat", "arrêt du contrat", "annulation", "quitter"),
    ("prise d'effet", "date de début", "durée du contrat", "tacite reconduction", "renouvellement"),
    ("maternité", "maternite", "accouchement", "césarienne", "grossesse", "naissance", "bébé"),
    ("dentaire", "dent", "dentiste", "prothèse dentaire", "orthodontie", "appareil dentaire"),
    ("optique", "lunettes", "verres", "monture", "vue", "ophtalmologue"),
    ("kinésithérapie", "kinesitherapie", "kiné", "rééducation", "physiothérapie"),
    ("imagerie", "radio", "radiographie", "échographie", "scanner", "irm", "scan"),
    (
        "laboratoire",
        "analyses",
        "analyse de sang",
        "bilan sanguin",
        "biologie",
        "examens biologiques",
    ),
    (
        "hospitalisation",
        "hôpital",
        "clinique",
        "chirurgie",
        "opération",
        "intervention chirurgicale",
        "séjour",
    ),
    ("pharmacie", "médicament", "médicaments", "pharmacien"),
    ("consultation", "médecin", "docteur", "généraliste", "spécialiste", "rendez-vous"),
    (
        "données personnelles",
        "données de santé",
        "confidentialité",
        "vie privée",
        "rgpd",
        "protection des données",
    ),
    (
        "contact",
        "téléphone",
        "numéro",
        "email",
        "e-mail",
        "joindre",
        "appeler",
        "urgence",
        "urgences",
    ),
    (
        "statut",
        "suivi",
        "dossier",
        "en cours",
        "payée",
        "rejetée",
        "motif de rejet",
        "refus",
        "refusé",
    ),
    (
        "prestataire conventionné",
        "établissement conventionné",
        "réseau de soins",
        "réseau",
        "conventionné",
    ),
    (
        "remboursement hors tiers payant",
        "j'ai avancé",
        "avance des frais",
        "virement",
        "mobile money",
    ),
    (
        "pièces justificatives",
        "documents à fournir",
        "justificatifs",
        "papiers",
        "dossier à fournir",
    ),
)


def norm(texte: str) -> str:
    decompose = unicodedata.normalize("NFD", texte.lower().replace("’", "'"))
    return "".join(caractere for caractere in decompose if unicodedata.category(caractere) != "Mn")


def _motif(terme: str) -> re.Pattern[str]:
    propre = norm(terme)
    fin = r"(?!\w)" if len(propre) <= 3 else ""
    return re.compile(r"(?<!\w)" + re.escape(propre) + fin)


_GROUPES_COMPILES = tuple(tuple((terme, _motif(terme)) for terme in groupe) for groupe in _GROUPES)


def expandre(texte: str) -> str:
    normalise = norm(texte)
    ajouts: list[str] = []
    for groupe in _GROUPES_COMPILES:
        if any(motif.search(normalise) for _, motif in groupe):
            ajouts.extend(terme for terme, motif in groupe if not motif.search(normalise))
    return " ".join(ajouts)


def texte_recherche(question: str) -> str:
    ajouts = expandre(question)
    if not ajouts:
        return question
    return f"{question} {ajouts}"


def formule_citee(question: str) -> str | None:
    normalise = norm(question)
    trouves = [
        nom for nom in FORMULES if re.search(r"(?<!\w)" + nom.lower() + r"(?!\w)", normalise)
    ]
    if len(trouves) == 1:
        return trouves[0]
    return None


def formule_recherche(role: str, question: str, formule_profil: str | None) -> str | None:
    if role == "assure":
        if formule_profil in FORMULES:
            return formule_profil
        return None
    return formule_citee(question)
