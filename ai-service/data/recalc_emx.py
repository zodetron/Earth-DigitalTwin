"""
Recalculate EarthMind Risk Index after fire/flood scores are updated.
Run after seed_fire.py and after flood predictions are stored.
"""

import os, sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path(__file__).parent.parent))

import psycopg2

DATABASE_URL = os.environ["DATABASE_URL"]


def recalc():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute("""
        UPDATE earth_risk
        SET
          earthmind_risk_index = LEAST(
            flood_risk            * 0.28 +
            fire_risk             * 0.22 +
            climate_stress        * 0.18 +
            environmental_risk    * 0.12 +
            population_exposure   * 0.10 +
            (1 - emergency_readiness) * 0.06 +
            economic_vulnerability * 0.04,
            0.97
          ),
          risk_level = CASE
            WHEN (flood_risk * 0.28 + fire_risk * 0.22 + climate_stress * 0.18 +
                  environmental_risk * 0.12 + population_exposure * 0.10 +
                  (1 - emergency_readiness) * 0.06 + economic_vulnerability * 0.04) >= 0.75 THEN 'CRITICAL'
            WHEN (flood_risk * 0.28 + fire_risk * 0.22 + climate_stress * 0.18 +
                  environmental_risk * 0.12 + population_exposure * 0.10 +
                  (1 - emergency_readiness) * 0.06 + economic_vulnerability * 0.04) >= 0.50 THEN 'HIGH'
            WHEN (flood_risk * 0.28 + fire_risk * 0.22 + climate_stress * 0.18 +
                  environmental_risk * 0.12 + population_exposure * 0.10 +
                  (1 - emergency_readiness) * 0.06 + economic_vulnerability * 0.04) >= 0.25 THEN 'MODERATE'
            ELSE 'LOW'
          END,
          updated_at = NOW()
    """)

    updated = cur.rowcount
    conn.commit()

    # Print earth health
    cur.execute("SELECT ROUND((1 - AVG(earthmind_risk_index)) * 100, 1) FROM earth_risk")
    health = cur.fetchone()[0]

    cur.close()
    conn.close()
    print(f"[recalc_emx] Updated {updated} city risk records.")
    print(f"[recalc_emx] Earth Health Score: {health}/100")


if __name__ == "__main__":
    recalc()
