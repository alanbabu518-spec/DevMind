from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.analysis_service import analyze_code
from app.services.readiness_service import calculate_readiness

router = APIRouter()


class ReadinessRequest(BaseModel):
    language: str = Field(default="python", min_length=1, max_length=50)
    source_code: str = Field(min_length=1, max_length=20000)
    filename: str = Field(default="submitted.py", min_length=1, max_length=100)


@router.post("/api/readiness")
def get_readiness(request: ReadinessRequest):
    try:
        analysis = analyze_code(
            language=request.language,
            source_code=request.source_code,
            filename=request.filename,
        )
        return calculate_readiness(analysis)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
