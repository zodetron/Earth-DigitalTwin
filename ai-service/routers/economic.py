from fastapi import APIRouter
from pydantic import BaseModel
from agents.economic_agent import estimate_economic_impact

router = APIRouter(prefix="/economic", tags=["Economic Impact"])


class EconomicRequest(BaseModel):
    population: int = 1_000_000
    flood_risk: float = 0.0
    fire_risk: float = 0.0
    climate_stress: float = 0.0
    gdp_per_capita_usd: float = 15000.0
    city_id: str | None = None


@router.post("/impact")
def impact(req: EconomicRequest):
    return estimate_economic_impact(**req.model_dump(exclude={"city_id"}))
