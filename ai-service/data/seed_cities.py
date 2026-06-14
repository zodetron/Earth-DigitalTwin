"""
Seed cities from Natural Earth DBF + calculate initial EarthMind Risk scores.

Runs standalone: python data/seed_cities.py
"""

import os, sys, uuid, math
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── allow running from project root ──────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2
from psycopg2.extras import execute_values
from dbfread import DBF

DATASETS_PATH = Path(os.getenv("DATASETS_PATH", "../../ZUUP_DataSets"))
DBF_PATH = DATASETS_PATH / "geo" / "cities" / "ne_10m_populated_places_simple.dbf"
DATABASE_URL = os.environ["DATABASE_URL"]

# ─── Geographic risk profiles ────────────────────────────────────────────────
# Flood-prone regions (monsoon, river delta, low-lying coastal)
FLOOD_HIGH_COUNTRIES = {
    "BGD", "IND", "PAK", "MMR", "THA", "VNM", "KHM", "LAO", "PHL", "IDN",
    "CHN", "NPL", "BTN", "BGD", "ETH", "NGA", "MOZ", "MDG", "COD", "CAF",
    "SOM", "SDN", "SSD", "PRY", "BOL", "PER", "ECU", "COL", "GUY", "SUR",
    "GHA", "BEN", "NER", "MLI", "SEN", "GIN",
}
FLOOD_MODERATE_COUNTRIES = {
    "USA", "MEX", "BRA", "ARG", "URY", "CHL", "TUR", "IRN", "IRQ", "SYR",
    "EGY", "DZA", "MOR", "LBY", "KEN", "TZA", "UGA", "ZMB", "ZWE", "ANG",
    "CMR", "GEO", "AZE", "UZB", "TKM", "KAZ", "MNG",
}

# Fire-prone regions (dry climate, forest, savanna)
FIRE_HIGH_COUNTRIES = {
    "AUS", "BRA", "USA", "RUS", "CAN", "IDN", "AGO", "ZMB", "MOZ", "TZA",
    "COD", "CAF", "SDN", "ETH", "MDG", "VEN", "COL", "BOL", "PER", "MEX",
    "GRC", "PRT", "ESP", "ITA", "TUR", "ALG", "MAR",
}
FIRE_MODERATE_COUNTRIES = {
    "CHN", "IND", "KAZ", "MNG", "ZAF", "NAM", "BWA", "ZWE", "ARG", "CHL",
    "UKR", "POL", "BGR", "ROU", "HUN", "SVK", "SRB", "MKD", "BIH",
}

# Climate-stressed regions
CLIMATE_HIGH_COUNTRIES = {
    "BGD", "NPL", "IND", "PAK", "MDV", "KIR", "TUV", "MHL", "FSM", "NRU",
    "MDG", "MOZ", "ETH", "ERI", "DJI", "SOM", "SDN", "SSD", "NER", "MLI",
    "TCD", "MRT", "BFA", "SEN", "GMB", "GNB", "SLE", "LBR", "GIN",
}

# Economic vulnerability (low GDP countries)
ECON_VULN_HIGH = {
    "BDI", "CAF", "COD", "GNB", "LBR", "MDG", "MLI", "MOZ", "NER", "SLE",
    "SOM", "SSD", "TCD", "YEM", "AFG", "HTI", "NIC", "ZWE", "RWA", "UGA",
    "TZA", "ETH", "GIN", "CMR", "BEN", "TGO", "DJI", "MRT", "SEN", "GMB",
}

# Emergency readiness (developed nations higher readiness)
READINESS_HIGH = {
    "USA", "CAN", "GBR", "DEU", "FRA", "JPN", "AUS", "KOR", "NOR", "SWE",
    "DNK", "FIN", "CHE", "AUT", "NZL", "NLD", "BEL", "ISR", "SGP", "ARE",
}


def calc_risk_scores(rec: dict) -> dict:
    iso = (rec.get("adm0_a3") or "").upper()
    lat = float(rec.get("latitude") or 0)
    lng = float(rec.get("longitude") or 0)
    pop = int(rec.get("pop_max") or 0)

    # ── Flood risk ────────────────────────────────────────────────────────────
    flood = 0.1
    if iso in FLOOD_HIGH_COUNTRIES:
        flood = 0.55 + _jitter(0.2)
    elif iso in FLOOD_MODERATE_COUNTRIES:
        flood = 0.3 + _jitter(0.15)
    # Coastal bonus: within 200km of coast (rough heuristic via abs(lat))
    if abs(lat) < 35 and (abs(lng) < 20 or abs(lng) > 150 or (60 < lng < 130)):
        flood = min(flood + 0.08, 1.0)
    # Low-altitude tropical bonus
    if -15 < lat < 25:
        flood = min(flood + 0.05, 1.0)
    flood = round(min(flood, 0.97), 4)

    # ── Fire risk ─────────────────────────────────────────────────────────────
    fire = 0.08
    if iso in FIRE_HIGH_COUNTRIES:
        fire = 0.5 + _jitter(0.2)
    elif iso in FIRE_MODERATE_COUNTRIES:
        fire = 0.28 + _jitter(0.15)
    # Dry subtropical belt (20-35° lat)
    if 20 < abs(lat) < 35:
        fire = min(fire + 0.06, 1.0)
    fire = round(min(fire, 0.97), 4)

    # ── Climate stress ────────────────────────────────────────────────────────
    climate = 0.15
    if iso in CLIMATE_HIGH_COUNTRIES:
        climate = 0.52 + _jitter(0.18)
    elif abs(lat) < 25:
        climate = 0.28 + _jitter(0.12)
    climate = round(min(climate, 0.97), 4)

    # ── Population exposure ───────────────────────────────────────────────────
    pop_exposure = round(min(math.log10(max(pop, 1)) / 8, 1.0), 4)

    # ── Economic vulnerability ────────────────────────────────────────────────
    econ_vuln = 0.4 if iso in ECON_VULN_HIGH else 0.18 + _jitter(0.1)
    econ_vuln = round(min(econ_vuln, 0.97), 4)

    # ── Emergency readiness ───────────────────────────────────────────────────
    readiness = 0.7 if iso in READINESS_HIGH else 0.35 + _jitter(0.1)
    readiness = round(min(readiness, 0.95), 4)

    # ── Environmental risk (proxy) ────────────────────────────────────────────
    env_risk = round((flood * 0.4 + fire * 0.3 + climate * 0.3) * 0.8, 4)

    # ── EarthMind Risk Index ──────────────────────────────────────────────────
    emx = round(
        flood       * 0.28 +
        fire        * 0.22 +
        climate     * 0.18 +
        env_risk    * 0.12 +
        pop_exposure * 0.10 +
        (1 - readiness) * 0.06 +
        econ_vuln   * 0.04,
        4,
    )

    risk_level = (
        "CRITICAL" if emx >= 0.75 else
        "HIGH"     if emx >= 0.50 else
        "MODERATE" if emx >= 0.25 else
        "LOW"
    )

    return {
        "flood_risk": flood,
        "fire_risk": fire,
        "climate_stress": climate,
        "environmental_risk": env_risk,
        "population_exposure": pop_exposure,
        "emergency_readiness": readiness,
        "economic_vulnerability": econ_vuln,
        "earthmind_risk_index": emx,
        "risk_level": risk_level,
    }


def _jitter(spread: float) -> float:
    import random
    return random.uniform(-spread / 2, spread / 2)


def seed():
    print(f"[seed_cities] Reading DBF from {DBF_PATH}")
    if not DBF_PATH.exists():
        raise FileNotFoundError(f"DBF not found: {DBF_PATH}")

    dbf = DBF(str(DBF_PATH), encoding="latin-1", load=True)
    records = list(dbf.records)
    print(f"[seed_cities] Loaded {len(records)} cities from DBF")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # ── Truncate and reseed ────────────────────────────────────────────────────
    print("[seed_cities] Clearing existing data...")
    cur.execute("TRUNCATE TABLE prediction_history, fire_detections, flood_predictions, simulation_results, ai_reports, earth_risk, cities RESTART IDENTITY CASCADE")

    # ── Insert cities ─────────────────────────────────────────────────────────
    city_rows = []
    city_ids = []

    for rec in records:
        name = (rec.get("name") or "").strip()
        country = (rec.get("adm0name") or "").strip()
        iso_a2 = (rec.get("iso_a2") or "").strip()
        country_code = (rec.get("adm0_a3") or "").strip()
        lat = rec.get("latitude")
        lng = rec.get("longitude")
        pop = int(rec.get("pop_max") or 0)
        admin = (rec.get("adm1name") or "").strip()
        feature = (rec.get("featurecla") or "").strip()
        is_capital = bool(rec.get("adm0cap"))

        if not name or lat is None or lng is None:
            continue

        cid = str(uuid.uuid4())
        city_ids.append((cid, rec))
        city_rows.append((
            cid, name, country, country_code, iso_a2,
            float(lat), float(lng), pop,
            admin or None, feature or None, is_capital,
        ))

    print(f"[seed_cities] Inserting {len(city_rows)} valid cities...")
    execute_values(cur, """
        INSERT INTO cities
          (id, name, country, country_code, iso_a2, latitude, longitude,
           population, admin_region, feature_class, is_capital)
        VALUES %s
        ON CONFLICT DO NOTHING
    """, city_rows, page_size=500)

    # ── Insert earth_risk ─────────────────────────────────────────────────────
    print("[seed_cities] Calculating and inserting EarthMind Risk scores...")
    risk_rows = []
    for cid, rec in city_ids:
        r = calc_risk_scores(rec)
        risk_rows.append((
            str(uuid.uuid4()), cid,
            r["flood_risk"], r["fire_risk"], r["climate_stress"],
            r["environmental_risk"], r["population_exposure"],
            r["emergency_readiness"], r["economic_vulnerability"],
            r["earthmind_risk_index"], r["risk_level"],
        ))

    execute_values(cur, """
        INSERT INTO earth_risk
          (id, city_id, flood_risk, fire_risk, climate_stress,
           environmental_risk, population_exposure, emergency_readiness,
           economic_vulnerability, earthmind_risk_index, risk_level)
        VALUES %s
        ON CONFLICT (city_id) DO UPDATE SET
          flood_risk = EXCLUDED.flood_risk,
          fire_risk  = EXCLUDED.fire_risk,
          earthmind_risk_index = EXCLUDED.earthmind_risk_index,
          risk_level = EXCLUDED.risk_level,
          updated_at = NOW()
    """, risk_rows, page_size=500)

    conn.commit()
    cur.close()
    conn.close()

    # ── Summary ────────────────────────────────────────────────────────────────
    critical = sum(1 for _, rec in city_ids if calc_risk_scores(rec)["risk_level"] == "CRITICAL")
    high     = sum(1 for _, rec in city_ids if calc_risk_scores(rec)["risk_level"] == "HIGH")
    print(f"[seed_cities] Done. {len(city_rows)} cities seeded.")
    print(f"[seed_cities] Risk distribution — CRITICAL: {critical}, HIGH: {high}")


if __name__ == "__main__":
    seed()
