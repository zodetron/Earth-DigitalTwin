"""
Estimates the 20 flood-model features for a city based on:
  - Country ISO code (climate/governance profile)
  - Geographic position (latitude/longitude)
  - Population (density proxy)
  - Coastal proximity heuristic
"""

import math
from typing import TypedDict


class FloodFeatureVector(TypedDict):
    monsoon_intensity: float
    topography_drainage: float
    river_management: float
    deforestation: float
    urbanization: float
    climate_change: float
    dams_quality: float
    siltation: float
    agricultural_practices: float
    encroachments: float
    ineffective_disaster_preparedness: float
    drainage_systems: float
    coastal_vulnerability: float
    landslides: float
    watersheds: float
    deteriorating_infrastructure: float
    population_score: float
    wetland_loss: float
    inadequate_planning: float
    political_factors: float


# ─── Country-level risk profiles ─────────────────────────────────────────────
# Scores 0–10 for key governance / climate factors

_GOVERNANCE_GOOD = {"USA", "CAN", "GBR", "DEU", "FRA", "JPN", "AUS", "NOR", "SWE",
                    "DNK", "FIN", "CHE", "AUT", "NLD", "BEL", "NZL", "SGP", "KOR"}
_GOVERNANCE_POOR = {"BGD", "SDN", "SSD", "HAI", "SOM", "YEM", "AFG", "MMR", "PRK",
                    "LBR", "SLE", "GNB", "CAF", "COD", "ZWE"}

_MONSOON_HIGH = {"IND", "BGD", "PAK", "MMR", "THA", "VNM", "KHM", "LAO", "PHL",
                 "NPL", "LKA", "IDN", "MYS", "BTN", "BGD"}
_MONSOON_MOD  = {"CHN", "NGA", "GHA", "CMR", "ETH", "KEN", "TZA", "UGA", "MOZ"}

_DEFOREST_HIGH = {"IDN", "BRA", "COD", "MDG", "PHL", "CMR", "GHA", "NGA",
                  "PNG", "COL", "VEN", "PER", "BOL", "GTM", "HND"}
_DEFOREST_LOW  = {"FIN", "SWE", "NOR", "CAN", "RUS", "DEU", "AUT", "CHE", "NZL"}

_COASTAL_HIGH = {"BGD", "VNM", "NLD", "GUY", "SUR", "MDV", "LCA", "WSM",
                 "TON", "FSM", "KIR", "TUV", "FJI", "TLS"}

_POLITICAL_INSTAB = {"SOM", "SSD", "SDN", "YEM", "AFG", "SYR", "LBY", "IRQ",
                     "CAF", "MLI", "NER", "TCD", "ZWE", "VEN", "MMR"}


def _clamp(val: float, lo: float = 0.0, hi: float = 10.0) -> float:
    return round(max(lo, min(hi, val)), 2)


def estimate_features(
    country_code: str,
    latitude: float,
    longitude: float,
    population: int,
) -> FloodFeatureVector:
    iso = (country_code or "").upper()
    lat = abs(latitude)
    pop = max(population, 1)

    # ── Monsoon Intensity ─────────────────────────────────────────────────────
    if iso in _MONSOON_HIGH:
        monsoon = 7.5 + (lat < 20) * 1.0
    elif iso in _MONSOON_MOD:
        monsoon = 5.5
    elif lat < 15:                         # tropics
        monsoon = 6.0
    elif lat < 30:                         # subtropics
        monsoon = 4.0
    else:
        monsoon = 2.5
    monsoon = _clamp(monsoon + _noise(iso, "monsoon", 0.8))

    # ── Governance / Infrastructure quality ───────────────────────────────────
    if iso in _GOVERNANCE_GOOD:
        gov_quality = 8.5          # high quality → LOW risk factors
        gov_risk    = 1.5
    elif iso in _GOVERNANCE_POOR:
        gov_quality = 2.5
        gov_risk    = 7.5
    else:
        gdp_proxy = _gdp_proxy(iso)
        gov_quality = _clamp(4.0 + gdp_proxy * 4.0)
        gov_risk    = _clamp(6.0 - gdp_proxy * 4.0)

    river_mgmt         = _clamp(gov_quality + _noise(iso, "riv", 0.5))
    dams_quality       = _clamp(gov_quality + _noise(iso, "dam", 0.6))
    drainage_systems   = _clamp(gov_quality + _noise(iso, "drn", 0.5))
    ineff_preparedness = _clamp(gov_risk    + _noise(iso, "prep", 0.6))
    deteriorating_infra = _clamp(gov_risk   + _noise(iso, "infra", 0.7))
    inadequate_planning = _clamp(gov_risk   + _noise(iso, "plan", 0.5))
    political_factors   = _clamp(
        (7.5 if iso in _POLITICAL_INSTAB else gov_risk * 0.7) + _noise(iso, "pol", 0.5)
    )

    # ── Topography ────────────────────────────────────────────────────────────
    # Low-lying river deltas and coastal areas drain poorly
    topo = _clamp(
        (8 if iso in {"BGD", "NLD", "GUY", "MDV"} else
         6 if lat < 15 else
         4 if lat < 35 else 3)
        + _noise(iso, "topo", 0.6)
    )

    # ── Deforestation ─────────────────────────────────────────────────────────
    if iso in _DEFOREST_HIGH:
        deforest = _clamp(7.0 + _noise(iso, "def", 0.8))
    elif iso in _DEFOREST_LOW:
        deforest = _clamp(1.5 + _noise(iso, "def", 0.5))
    else:
        deforest = _clamp(4.5 + _noise(iso, "def", 1.0))

    # ── Urbanization (risk factor — informal settlements, impervious cover) ──
    pop_log = math.log10(pop)          # 3=1K, 6=1M, 7=10M
    urbanization = _clamp(2.0 + pop_log * 0.8 + _noise(iso, "urb", 0.6))

    # ── Climate Change exposure ───────────────────────────────────────────────
    climate_change = _clamp(
        (8.5 if iso in {"BGD", "NPL", "MDV", "KIR", "TUV"} else
         6.5 if lat < 20 else
         5.0 if lat < 40 else 3.5)
        + _noise(iso, "cc", 0.5)
    )

    # ── Siltation (river sedimentation) ──────────────────────────────────────
    siltation = _clamp(
        (8 if iso in {"BGD", "IND", "NPL", "MMR", "ETH"} else
         5 if lat < 25 else 3)
        + _noise(iso, "silt", 0.7)
    )

    # ── Agricultural Practices ────────────────────────────────────────────────
    agri = _clamp(
        (7 if iso in {"IND", "BGD", "ETH", "NGA", "MOZ", "SDN"} else
         4 if iso in _GOVERNANCE_GOOD else 5.5)
        + _noise(iso, "agri", 0.6)
    )

    # ── Encroachments (flood-plain building) ──────────────────────────────────
    encroachments = _clamp(gov_risk * 0.8 + pop_log * 0.3 + _noise(iso, "enc", 0.5))

    # ── Coastal Vulnerability ─────────────────────────────────────────────────
    coastal = _clamp(
        (9 if iso in _COASTAL_HIGH else
         7 if abs(longitude) > 140 or abs(longitude) < 30 else 4)
        + _noise(iso, "coast", 0.8)
    )

    # ── Landslides ────────────────────────────────────────────────────────────
    landslides = _clamp(
        (8 if iso in {"NPL", "COL", "PHL", "GTM", "HND", "PNG", "ETH"} else
         5 if lat < 25 else 3)
        + _noise(iso, "ls", 0.7)
    )

    # ── Watersheds (health of river basins) ───────────────────────────────────
    watersheds = _clamp(
        (8 if iso in {"BGD", "IND", "PAK", "MMR"} else
         5 if lat < 30 else 3.5)
        + _noise(iso, "ws", 0.6)
    )

    # ── Population Score ──────────────────────────────────────────────────────
    pop_score = _clamp(min(pop_log * 1.2, 10))

    # ── Wetland Loss ─────────────────────────────────────────────────────────
    wetland_loss = _clamp(
        (8 if iso in {"CHN", "IND", "IDN", "BGD", "NGA"} else
         5 if iso in _DEFOREST_HIGH else 3.5)
        + _noise(iso, "wl", 0.6)
    )

    return FloodFeatureVector(
        monsoon_intensity=monsoon,
        topography_drainage=topo,
        river_management=river_mgmt,
        deforestation=deforest,
        urbanization=urbanization,
        climate_change=climate_change,
        dams_quality=dams_quality,
        siltation=siltation,
        agricultural_practices=agri,
        encroachments=encroachments,
        ineffective_disaster_preparedness=ineff_preparedness,
        drainage_systems=drainage_systems,
        coastal_vulnerability=coastal,
        landslides=landslides,
        watersheds=watersheds,
        deteriorating_infrastructure=deteriorating_infra,
        population_score=pop_score,
        wetland_loss=wetland_loss,
        inadequate_planning=inadequate_planning,
        political_factors=political_factors,
    )


def _gdp_proxy(iso: str) -> float:
    """0=poor, 1=rich. Rough categorical proxy."""
    RICH  = {"USA","CAN","GBR","DEU","FRA","CHE","AUT","NLD","BEL","SWE","NOR","DNK",
              "FIN","JPN","AUS","NZL","SGP","KOR","ISR","ARE","QAT","KWT"}
    UPPER = {"CHN","BRA","MEX","ARG","POL","CZE","HUN","ROU","MYS","ZAF","THA","COL","PER"}
    LOWER = {"IND","IDN","NGA","PAK","BGD","ETH","KEN","TZA","GHA","VNM","PHL","EGY","MAR"}
    if iso in RICH:  return 0.9
    if iso in UPPER: return 0.6
    if iso in LOWER: return 0.3
    return 0.45


def _noise(iso: str, key: str, spread: float) -> float:
    """Deterministic pseudo-noise seeded by iso+key (reproducible per city)."""
    seed = sum(ord(c) for c in (iso + key))
    # Simple LCG
    val = ((seed * 1664525 + 1013904223) & 0xFFFFFFFF) / 0xFFFFFFFF
    return (val - 0.5) * spread * 2
