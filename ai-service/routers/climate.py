from fastapi import APIRouter
from pydantic import BaseModel
from agents.climate_agent import calculate_climate_stress

router = APIRouter(prefix="/climate", tags=["Climate Intelligence"])


class ClimateRequest(BaseModel):
    temperature: float = 25.0
    humidity: float = 60.0
    rainfall: float = 50.0
    wind_speed: float = 20.0
    vegetation_dryness: float = 40.0
    urbanization: float = 5.0
    deforestation: float = 5.0


@router.post("/stress")
def climate_stress(req: ClimateRequest):
    return calculate_climate_stress(**req.model_dump())
