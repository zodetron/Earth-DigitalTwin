from fastapi import APIRouter

router = APIRouter(prefix="/scan", tags=["Earth Scan"])


@router.post("/earth")
def scan_earth():
    """
    Full Earth scan — triggers all agents.
    Phase 4/5 will populate this with real batch processing.
    """
    return {
        "status": "scan_initiated",
        "message": "Full Earth scan queued. Agents processing.",
        "cities_scanned": 0,
        "agents_triggered": [
            "FloodIntelligence",
            "WildfireIntelligence",
            "Climate",
            "EmergencyCommander",
            "EconomicImpact",
        ],
    }
