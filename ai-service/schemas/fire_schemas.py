from pydantic import BaseModel
from typing import Optional
from datetime import date


class FireAnalysisRequest(BaseModel):
    country: Optional[str] = None
    city_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_km: float = 100.0


class FireCluster(BaseModel):
    cluster_id: int
    center_lat: float
    center_lng: float
    hotspot_count: int
    avg_frp: float
    max_brightness: float
    severity_score: float
    risk_level: str


class FireAnalysisResponse(BaseModel):
    total_hotspots: int
    clusters: list[FireCluster]
    avg_frp: float
    max_frp: float
    country: Optional[str]
