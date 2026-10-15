from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.facture import FactureIn


class LoginIn(BaseModel):
    identifiant: str = Field(min_length=1, max_length=64)
    mot_de_passe: str = Field(min_length=1, max_length=200)


class LotFacturesIn(BaseModel):
    factures: list[FactureIn] = Field(min_length=1, max_length=50)


class DecisionIn(BaseModel):
    decision: Literal["valider", "rejeter", "complement"]
    motif: str = Field(min_length=1, max_length=500)


class ReglagesIn(BaseModel):
    alert_threshold: float | None = None
    notification_channels: list[str] | None = None
    n8n_webhook_url: str | None = None
    active_model_version: str | None = None
    drift_psi_threshold: float | None = None


class AlerteJournalIn(BaseModel):
    facture_id: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9._-]+$")
    canal: Literal["slack", "email", "webhook"]
    statut: Literal["envoye", "echec"]
    tentative: int = Field(ge=1, le=5)
    score: float | None = Field(default=None, ge=0, le=1)
    message: str = Field(min_length=1, max_length=2000)
