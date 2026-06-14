from fastapi import APIRouter, HTTPException
from schemas.fire_schemas import FireAnalysisRequest, FireAnalysisResponse
from agents.fire_agent import get_fire_agent

router = APIRouter(prefix="/fire", tags=["Wildfire Intelligence"])


@router.post("/analyze", response_model=FireAnalysisResponse)
def analyze_fire(req: FireAnalysisRequest):
    agent = get_fire_agent()
    if req.country:
        result = agent.analyze_country(req.country, req.start_date, req.end_date)
    elif req.lat is not None and req.lng is not None:
        hotspots = agent.get_hotspots_near(req.lat, req.lng, req.radius_km)
        result = {"total_hotspots": len(hotspots), "clusters": [], "avg_frp": 0, "max_frp": 0, "country": None}
    else:
        raise HTTPException(status_code=400, detail="Provide country or lat/lng")
    return result


@router.get("/hotspots/near")
def hotspots_near(lat: float, lng: float, radius_km: float = 100):
    agent = get_fire_agent()
    return agent.get_hotspots_near(lat, lng, radius_km)[:500]
