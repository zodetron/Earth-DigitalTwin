"""Simulation Agent — Future Scenario Engine"""
import uuid
from .climate_agent import calculate_climate_stress

FUTURE_MULTIPLIERS = {
    "CURRENT": {"temp": 0, "rainfall": 0, "dryness": 0},
    "2030":     {"temp": 1.2, "rainfall": 8, "dryness": 5},
    "2040":     {"temp": 2.0, "rainfall": 15, "dryness": 12},
    "2050":     {"temp": 3.1, "rainfall": 22, "dryness": 20},
    "WORST_CASE": {"temp": 5.0, "rainfall": 40, "dryness": 35},
}


def run_simulation(params: dict) -> dict:
    mode_raw = params.get("mode", "CURRENT")
    mode = mode_raw.value if hasattr(mode_raw, "value") else str(mode_raw)
    multipliers = FUTURE_MULTIPLIERS.get(mode, FUTURE_MULTIPLIERS["CURRENT"])

    temp = params.get("temperature", 25) + multipliers["temp"]
    rainfall = params.get("rainfall", 50) + multipliers["rainfall"]
    dryness = min(params.get("vegetation_dryness", 40) + multipliers["dryness"], 100)
    humidity = params.get("humidity", 60)
    wind = params.get("wind_speed", 20)
    pop_density = params.get("population_density", 50)

    climate = calculate_climate_stress(temp, humidity, rainfall, wind, dryness)

    # Flood risk from rainfall + humidity + climate stress
    flood_risk = min(
        0.3 * (rainfall / 200)
        + 0.3 * (humidity / 100)
        + 0.4 * climate["stress_index"],
        1.0
    )

    # Fire risk from dryness + wind + temperature
    fire_risk = min(
        0.4 * (dryness / 100)
        + 0.3 * (wind / 200)
        + 0.3 * ((temp - 15) / 45),
        1.0
    )
    fire_risk = max(fire_risk, 0)

    climate_stress = climate["stress_index"]

    baseline_health = 82.0
    simulated_health = baseline_health * (1 - 0.4 * flood_risk - 0.35 * fire_risk - 0.25 * climate_stress)
    health_delta = round(simulated_health - baseline_health, 2)

    pop_base = int(pop_density * 100_000)
    economic_loss = pop_base * flood_risk * 5000 + pop_base * fire_risk * 3000
    recovery_days = int(30 + flood_risk * 200 + fire_risk * 150)
    affected_pop = int(pop_base * max(flood_risk, fire_risk) * 0.6)

    return {
        "session_id": params.get("session_id") or str(uuid.uuid4()),
        "mode": mode,
        "flood_risk_sim": round(flood_risk, 4),
        "fire_risk_sim": round(fire_risk, 4),
        "climate_stress_sim": round(climate_stress, 4),
        "earth_health_delta": health_delta,
        "economic_loss_usd": round(economic_loss, 2),
        "recovery_days": recovery_days,
        "affected_population": affected_pop,
        "explanation": _generate_explanation(mode, flood_risk, fire_risk, climate_stress),
    }


def _generate_explanation(mode: str, flood: float, fire: float, climate: float) -> str:
    dominant = max([("flood", flood), ("fire", fire), ("climate stress", climate)], key=lambda x: x[1])
    return (
        f"Under {mode} scenario, {dominant[0]} risk dominates at {dominant[1]:.0%}. "
        f"Combined environmental stress reaches {(flood + fire + climate) / 3:.0%}."
    )
