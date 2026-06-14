from fastapi import APIRouter, HTTPException
from schemas.flood_schemas import FloodFeatures, FloodPredictionResponse
from agents.flood_agent import get_flood_agent

router = APIRouter(prefix="/flood", tags=["Flood Intelligence"])


@router.post("/predict", response_model=FloodPredictionResponse)
def predict_flood(features: FloodFeatures):
    try:
        agent = get_flood_agent()
        result = agent.predict(features.model_dump(exclude={"city_id"}))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-predict")
def batch_predict(records: list[FloodFeatures]):
    agent = get_flood_agent()
    return [agent.predict(r.model_dump(exclude={"city_id"})) for r in records]
