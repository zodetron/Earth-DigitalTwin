from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.emergency_agent import generate_emergency_plan

router = APIRouter(prefix="/emergency", tags=["Emergency Commander"])


class EmergencyRequest(BaseModel):
    city_name: str
    country: str
    flood_risk: float = 0.0
    fire_risk: float = 0.0
    population: int = 1_000_000
    earthmind_risk_index: float = 0.5
    city_id: str | None = None


@router.post("/plan")
def plan(req: EmergencyRequest):
    try:
        return generate_emergency_plan(
            req.city_name,
            req.country,
            req.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
