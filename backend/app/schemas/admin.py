from pydantic import BaseModel, Field


class PseudoIn(BaseModel):
    pseudo_id: str = Field(pattern=r"^[0-9a-f]{64}$")
