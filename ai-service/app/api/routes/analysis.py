from fastapi import APIRouter, HTTPException

from app.schemas.analysis import AnalyzeRequest
from app.services.analysis_service import analyze_code

router = APIRouter()

@router.post("/api/analyze")
def analyze(request: AnalyzeRequest):
    try:
        return analyze_code(
            language=request.language,
            source_code=request.source_code,
            filename=request.filename,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
