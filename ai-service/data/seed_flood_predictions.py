"""
Batch-predict flood risk for all cities using XGBoost + city feature estimator.
Stores results in flood_predictions and updates earth_risk.flood_risk.

Usage: python data/seed_flood_predictions.py
"""

import os, sys, uuid
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path(__file__).parent.parent))

import json
import psycopg2
from psycopg2.extras import execute_values

from agents.flood_agent import get_flood_agent
from agents.city_feature_estimator import estimate_features

DATABASE_URL = os.environ["DATABASE_URL"]
BATCH_SIZE = 200


def seed():
    print("[seed_flood] Loading flood agent (trains if needed)...")
    agent = get_flood_agent()
    print("[seed_flood] Flood agent ready")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    cur.execute("""
        SELECT id, name, country, country_code, latitude, longitude, population
        FROM cities
        ORDER BY population DESC NULLS LAST
    """)
    cities = cur.fetchall()
    print(f"[seed_flood] Predicting flood risk for {len(cities)} cities...")

    # Clear old predictions
    cur.execute("DELETE FROM flood_predictions")
    conn.commit()

    pred_rows = []
    risk_updates = []
    errors = 0

    for i, (cid, name, country, country_code, lat, lng, pop) in enumerate(cities):
        try:
            features = estimate_features(
                country_code=country_code or "",
                latitude=float(lat),
                longitude=float(lng),
                population=int(pop or 0),
            )
            result = agent.predict(features)

            pred_rows.append((
                str(uuid.uuid4()),
                cid,
                result["flood_probability"],
                result["risk_level"],
                features["monsoon_intensity"],
                features["urbanization"],
                features["deforestation"],
                features["climate_change"],
                features["population_score"],
                json.dumps(result["shap_values"]),
                json.dumps(result["top_factors"]),
                result["confidence"],
                result["model_version"],
            ))
            risk_updates.append((result["flood_probability"], cid))

        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"  [warn] {name}: {e}")

        if len(pred_rows) >= BATCH_SIZE:
            _flush(cur, conn, pred_rows)
            pred_rows = []

        if (i + 1) % 500 == 0:
            pct = (i + 1) / len(cities) * 100
            print(f"  {i+1}/{len(cities)} ({pct:.0f}%)...")

    if pred_rows:
        _flush(cur, conn, pred_rows)

    # Bulk update earth_risk.flood_risk
    print("[seed_flood] Updating earth_risk.flood_risk...")
    execute_values(cur, """
        UPDATE earth_risk er
        SET flood_risk = v.flood_prob,
            updated_at = NOW()
        FROM (VALUES %s) AS v(flood_prob, city_id)
        WHERE er.city_id = v.city_id::uuid
    """, risk_updates, page_size=500, template="(%s::decimal, %s)")
    conn.commit()

    cur.close()
    conn.close()
    print(f"[seed_flood] Done. {len(cities) - errors} predictions stored ({errors} errors).")


def _flush(cur, conn, rows):
    execute_values(cur, """
        INSERT INTO flood_predictions
          (id, city_id, flood_probability, risk_level,
           monsoon_intensity, urbanization_score, deforestation_score,
           climate_change_score, population_score,
           shap_values, top_factors, confidence, model_version)
        VALUES %s ON CONFLICT DO NOTHING
    """, rows, page_size=200)
    conn.commit()


if __name__ == "__main__":
    seed()
