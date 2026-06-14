from fastapi import APIRouter
from schemas.simulation_schemas import SimulationRequest, SimulationResponse
from agents.simulation_agent import run_simulation

router = APIRouter(prefix="/simulation", tags=["Simulation Engine"])


@router.post("/run", response_model=SimulationResponse)
def run(req: SimulationRequest):
    return run_simulation(req.model_dump())
