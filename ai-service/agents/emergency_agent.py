"""Emergency Commander Agent"""
import os
import anthropic

_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


def generate_emergency_plan(city_name: str, country: str, risk_data: dict) -> dict:
    flood_risk = risk_data.get("flood_risk", 0)
    fire_risk = risk_data.get("fire_risk", 0)
    population = risk_data.get("population", 1_000_000)
    risk_index = risk_data.get("earthmind_risk_index", 0.5)

    prompt = f"""You are the Emergency Commander AI for EarthMind X.

City: {city_name}, {country}
Population: {population:,}
EarthMind Risk Index: {risk_index:.2f}
Flood Risk: {flood_risk:.2%}
Fire Risk: {fire_risk:.2%}

Generate a concise emergency response plan with:
1. IMMEDIATE ACTIONS (next 24 hours)
2. EVACUATION ZONES (priority areas)
3. RESOURCE ALLOCATION (emergency services, supplies)
4. COMMUNICATION PLAN (alert systems)
5. RECOVERY TIMELINE

Be specific, actionable, and proportional to the risk levels shown."""

    message = get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    plan_text = message.content[0].text
    sections = plan_text.split("\n\n")

    return {
        "plan": plan_text,
        "priorities": [s.strip() for s in sections[:3] if s.strip()],
        "resources": ["Emergency Response Teams", "Medical Units", "Evacuation Vehicles", "Emergency Supplies"],
        "timeline": _estimate_timeline(risk_index),
    }


def _estimate_timeline(risk_index: float) -> str:
    if risk_index >= 0.75: return "72-hour emergency mobilization"
    if risk_index >= 0.5:  return "1-week response window"
    if risk_index >= 0.25: return "2-4 week preparation phase"
    return "Monthly readiness review"
