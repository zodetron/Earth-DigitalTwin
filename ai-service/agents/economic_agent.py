"""Economic Impact Agent"""


def estimate_economic_impact(
    population: int,
    flood_risk: float,
    fire_risk: float,
    climate_stress: float,
    gdp_per_capita_usd: float = 15000.0,
) -> dict:
    combined_risk = 0.45 * flood_risk + 0.35 * fire_risk + 0.20 * climate_stress
    affected_pop = int(population * combined_risk * 0.7)
    loss_per_person = gdp_per_capita_usd * (0.3 + combined_risk * 0.5)
    direct_loss = affected_pop * loss_per_person
    infrastructure_loss = direct_loss * 0.4
    total_loss = direct_loss + infrastructure_loss

    recovery_cost = total_loss * 1.8
    recovery_days = int(60 + combined_risk * 365)

    return {
        "loss_usd": round(total_loss, 2),
        "direct_loss_usd": round(direct_loss, 2),
        "infrastructure_loss_usd": round(infrastructure_loss, 2),
        "recovery_cost_usd": round(recovery_cost, 2),
        "recovery_days": recovery_days,
        "affected_population": affected_pop,
        "combined_risk": round(combined_risk, 4),
        "risk_category": _risk_category(combined_risk),
    }


def _risk_category(r: float) -> str:
    if r >= 0.75: return "CATASTROPHIC"
    if r >= 0.5:  return "SEVERE"
    if r >= 0.25: return "MODERATE"
    return "LOW"
