from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    language: str = Field(default="python")
    source_code: str = Field(min_length=1, max_length=20000)
    filename: str = Field(default="submitted.py", max_length=100)
