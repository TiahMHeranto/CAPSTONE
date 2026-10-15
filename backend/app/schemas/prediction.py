from pydantic import BaseModel, Field


class Contribution(BaseModel):
    variable: str
    contribution: float
    libelle: str


class Prediction(BaseModel):
    facture_id: str
    score: float = Field(ge=0, le=1)
    classe: str
    model_version: str
    explications: list[Contribution]
