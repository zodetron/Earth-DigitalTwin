"""Climate Agent — Environmental Stress Index Calculator"""


def calculate_climate_stress(
    temperature: float,
    humidity: float,
    rainfall: float,
    wind_speed: float,
    vegetation_dryness: float,
    urbanization: float = 5.0,
    deforestation: float = 5.0,
) -> dict:
    """
    Weighted climate stress score [0..1].
    All inputs normalized to [0..1] before scoring.
    """
    temp_stress = min(max((temperature - 20) / 40, 0), 1)
    humidity_stress = abs(humidity - 50) / 50
    rainfall_stress = min(rainfall / 200, 1)
    wind_stress = min(wind_speed / 200, 1)
    dryness_stress = vegetation_dryness / 100
    urban_stress = urbanization / 10
    deforest_stress = deforestation / 10

    stress_index = (
        temp_stress       * 0.25 +
        humidity_stress   * 0.15 +
        rainfall_stress   * 0.20 +
        wind_stress       * 0.10 +
        dryness_stress    * 0.15 +
        urban_stress      * 0.10 +
        deforest_stress   * 0.05
    )
    stress_index = round(min(stress_index, 1.0), 4)

    dominant = max([
        ("temperature", temp_stress * 0.25),
        ("humidity", humidity_stress * 0.15),
        ("rainfall", rainfall_stress * 0.20),
        ("wind", wind_stress * 0.10),
        ("vegetation_dryness", dryness_stress * 0.15),
        ("urbanization", urban_stress * 0.10),
        ("deforestation", deforest_stress * 0.05),
    ], key=lambda x: x[1])

    return {
        "stress_index": stress_index,
        "risk_level": _risk_level(stress_index),
        "dominant_factor": dominant[0],
        "components": {
            "temperature": round(temp_stress, 4),
            "humidity": round(humidity_stress, 4),
            "rainfall": round(rainfall_stress, 4),
            "wind_speed": round(wind_stress, 4),
            "vegetation_dryness": round(dryness_stress, 4),
            "urbanization": round(urban_stress, 4),
            "deforestation": round(deforest_stress, 4),
        },
    }


def _risk_level(score: float) -> str:
    if score >= 0.75: return "CRITICAL"
    if score >= 0.5:  return "HIGH"
    if score >= 0.25: return "MODERATE"
    return "LOW"
