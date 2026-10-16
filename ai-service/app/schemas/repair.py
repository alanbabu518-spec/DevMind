from pydantic import BaseModel, Field


class RepairRequest(BaseModel):
    language: str = Field(
        default="python",
        min_length=1,
        max_length=50,
    )
    source_code: str = Field(
        min_length=1,
        max_length=20000,
    )
    filename: str = Field(
        default="submitted.py",
        min_length=1,
        max_length=100,
    )
    rule: str = Field(
        min_length=1,
        max_length=50,
    )
