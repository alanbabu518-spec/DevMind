from fastapi import APIRouter, HTTPException

from app.schemas.repair import RepairRequest
from app.services.repair_service import propose_repair

router = APIRouter()


@router.post("/api/repair")
def repair(request: RepairRequest):
    try:
        return propose_repair(
            language=request.language,
            filename=request.filename,
            source_code=request.source_code,
            rule=request.rule,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        message = str(exc)
        status_code = 503 if "NVIDIA_API_KEY is missing" in message else 502
        raise HTTPException(
            status_code=status_code,
            detail=message,
        ) from exc
