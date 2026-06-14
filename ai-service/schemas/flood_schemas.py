from pydantic import BaseModel, Field
from typing import Optional


class FloodFeatures(BaseModel):
    monsoon_intensity: float = Field(..., ge=0, le=10)
    topography_drainage: float = Field(..., ge=0, le=10)
    river_management: float = Field(..., ge=0, le=10)
    deforestation: float = Field(..., ge=0, le=10)
    urbanization: float = Field(..., ge=0, le=10)
    climate_change: float = Field(..., ge=0, le=10)
    dams_quality: float = Field(..., ge=0, le=10)
    siltation: float = Field(..., ge=0, le=10)
    agricultural_practices: float = Field(..., ge=0, le=10)
    encroachments: float = Field(..., ge=0, le=10)
    ineffective_disaster_preparedness: float = Field(..., ge=0, le=10)
    drainage_systems: float = Field(..., ge=0, le=10)
    coastal_vulnerability: float = Field(..., ge=0, le=10)
    landslides: float = Field(..., ge=0, le=10)
    watersheds: float = Field(..., ge=0, le=10)
    deteriorating_infrastructure: float = Field(..., ge=0, le=10)
    population_score: float = Field(..., ge=0, le=10)
    wetland_loss: float = Field(..., ge=0, le=10)
    inadequate_planning: float = Field(..., ge=0, le=10)
    political_factors: float = Field(..., ge=0, le=10)
    city_id: Optional[str] = None


class FloodPredictionResponse(BaseModel):
    flood_probability: float
    risk_level: str
    confidence: float
    shap_values: dict[str, float]
    top_factors: list[dict]
    model_version: str = "v1"
