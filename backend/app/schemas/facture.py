from datetime import date

from pydantic import BaseModel, Field


class LigneFactureIn(BaseModel):
    code: str
    type_ligne: str
    quantite: float
    prix_unitaire: int
    montant: int


class FactureIn(BaseModel):
    facture_id: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9._-]+$")
    type_facture: str
    date_soin: date
    date_facture: date
    date_reception: date | None = None
    date_traitement: date | None = None
    montant_total: int
    devise: str = "MGA"
    prestataire_id: str | None = None
    assure_id: str | None = None
    contrat_id: str | None = None
    canal_reception: str | None = None
    mode_reglement: str | None = None
    lignes: list[LigneFactureIn] = Field(default_factory=list)


class Rejet(BaseModel):
    code: str
    motif: str


class ResultatValidation(BaseModel):
    valide: bool
    rejets: list[Rejet]
