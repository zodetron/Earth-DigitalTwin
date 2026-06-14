from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class SimulationMode(str, Enum):
    CURRENT = "CURRENT"
    YEAR_2030 = "2030"
    YEAR_2040 = "2040"
    YEAR_2050 = "2050"
    WORST_CASE = "WORST_CASE"


class SimulationRequest(BaseModel):
    mode: SimulationMode = SimulationMode.CURRENT
    rainfall: float = Field(50.0, ge=0, le=200)
    temperature: float = Field(25.0, ge=-20, le=60)
    humidity: float = Field(60.0, ge=0, le=100)
    wind_speed: float = Field(20.0, ge=0, le=300)
    vegetation_dryness: float = Field(40.0, ge=0, le=100)
    population_density: float = Field(50.0, ge=0, le=100)
    session_id: Optional[str] = None
    city_id: Optional[str] = None


class SimulationResponse(BaseModel):
    session_id: str
    mode: str
    flood_risk_sim: float
    fire_risk_sim: float
    climate_stress_sim: float
    earth_health_delta: float
    economic_loss_usd: float
    recovery_days: int
    affected_population: int
    explanation: str
