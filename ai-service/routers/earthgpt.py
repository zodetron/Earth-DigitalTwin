from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agents.earthgpt_agent import query

router = APIRouter(prefix="/earthgpt", tags=["EarthGPT"])


class EarthGPTRequest(BaseModel):
    query: str
    context: dict | None = None
    city_id: str | None = None
    country_code: str | None = None


@router.post("/query")
def ask(req: EarthGPTRequest):
    try:
        return query(req.query, req.context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
