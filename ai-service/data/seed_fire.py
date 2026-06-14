"""
Seed fire detections from VIIRS 2024 data.
- Samples top-FRP hotspots per country (max 8,000 per country)
- Uses sklearn BallTree for O(log n) nearest-city lookup
- Runs in ~2-3 minutes for priority countries

Usage:
    python data/seed_fire.py                 # priority countries
    python data/seed_fire.py --all           # all 180 countries (slow)
    python data/seed_fire.py --country India Australia
"""

import os, sys, uuid, argparse
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from sklearn.cluster import DBSCAN
from sklearn.neighbors import BallTree

DATASETS_PATH = Path(os.getenv("DATASETS_PATH", "../../ZUUP_DataSets"))
VIIRS_DIR = DATASETS_PATH / "wildfire" / "2024"
DATABASE_URL = os.environ["DATABASE_URL"]

MAX_PER_COUNTRY = 8_000   # top-FRP hotspots per country
EPS_KM         = 50.0     # DBSCAN cluster radius
MAX_CITY_KM    = 300.0    # max distance for city assignment

PRIORITY_COUNTRIES = [
    "Australia", "Brazil", "United_States", "Russian_Federation",
    "Canada", "Indonesia", "Democratic_Republic_of_the_Congo",
    "Angola", "India", "China", "South_Africa", "Mexico",
    "Argentina", "Venezuela", "Bolivia", "Ethiopia", "Tanzania",
    "Myanmar", "Thailand", "Mozambique", "Zambia", "Nigeria",
    "Philippines", "Indonesia",
]


def build_city_tree(conn):
    """Return BallTree over city lat/lng + list of city ids."""
    cur = conn.cursor()
    cur.execute("SELECT id, latitude, longitude FROM cities")
    rows = cur.fetchall()
    cur.close()
    city_ids = [r[0] for r in rows]
    coords = np.radians([[float(r[1]), float(r[2])] for r in rows])
    tree = BallTree(coords, metric="haversine")
    return tree, city_ids


def find_nearest_cities(tree, city_ids, lats, lngs, max_km):
    """Vectorized nearest-city lookup using BallTree."""
    pts = np.radians(np.column_stack([lats, lngs]))
    dists, idxs = tree.query(pts, k=1)
    dists_km = dists.flatten() * 6371.0
    result = []
    for dist, idx in zip(dists_km, idxs.flatten()):
        result.append(city_ids[idx] if dist <= max_km else None)
    return result


def process_country(path: Path, tree, city_ids, country_name: str) -> list[tuple]:
    try:
        df = pd.read_csv(path, low_memory=False, usecols=lambda c: c.lower() in
            ["latitude","longitude","frp","bright_ti4","confidence","acq_date","acq_time","daynight","type"])
    except Exception as e:
        print(f"  [skip] {e}")
        return []

    df.columns = df.columns.str.lower()
    df["frp"] = pd.to_numeric(df.get("frp", pd.Series(dtype=float)), errors="coerce").fillna(0)
    df["bright_ti4"] = pd.to_numeric(df.get("bright_ti4", pd.Series(dtype=float)), errors="coerce").fillna(300)
    df = df.dropna(subset=["latitude", "longitude"])
    if df.empty:
        return []

    # Sample: keep highest-FRP detections (most significant fires)
    if len(df) > MAX_PER_COUNTRY:
        df = df.nlargest(MAX_PER_COUNTRY, "frp")

    df = df.reset_index(drop=True)
    lats = df["latitude"].astype(float).values
    lngs = df["longitude"].astype(float).values

    # DBSCAN clustering
    coords_rad = np.radians(np.column_stack([lats, lngs]))
    labels = DBSCAN(
        eps=EPS_KM / 6371.0,
        min_samples=2,
        algorithm="ball_tree",
        metric="haversine",
    ).fit_predict(coords_rad)

    # Nearest city (vectorized)
    city_assignments = find_nearest_cities(tree, city_ids, lats, lngs, MAX_CITY_KM)

    rows = []
    for i in range(len(df)):
        frp   = float(df["frp"].iloc[i])
        bright = float(df["bright_ti4"].iloc[i])
        cluster = int(labels[i])

        severity = round(min(
            0.4 * min(frp / 100, 1.0) +
            0.3 * min((bright - 300) / 100, 1.0) +
            0.3 * (1.0 if cluster >= 0 else 0.1),
            1.0
        ), 4)

        rows.append((
            str(uuid.uuid4()),
            city_assignments[i],
            round(float(lats[i]), 7),
            round(float(lngs[i]), 7),
            round(bright, 2),
            round(frp, 3),
            str(df.get("confidence", pd.Series(["n"] * len(df))).iloc[i])[:5],
            str(df.get("acq_date", pd.Series(["2024-01-01"] * len(df))).iloc[i])[:10],
            str(df.get("acq_time", pd.Series([""] * len(df))).iloc[i])[:6] or None,
            str(df.get("daynight", pd.Series(["D"] * len(df))).iloc[i])[:1],
            int(df["type"].iloc[i]) if "type" in df.columns and not pd.isna(df["type"].iloc[i]) else 0,
            cluster if cluster >= 0 else None,
            severity,
            country_name,
        ))
    return rows


def seed(countries=None, all_countries=False):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print("[seed_fire] Building city spatial index...")
    tree, city_ids = build_city_tree(conn)
    print(f"[seed_fire] BallTree over {len(city_ids)} cities ready")

    if all_countries:
        files = sorted(VIIRS_DIR.glob("viirs-snpp_2024_*.csv"))
    else:
        targets = countries or PRIORITY_COUNTRIES
        files = [VIIRS_DIR / f"viirs-snpp_2024_{c}.csv" for c in targets]
        files = [f for f in files if f.exists()]

    print(f"[seed_fire] Clearing old fire detections...")
    cur.execute("DELETE FROM fire_detections")
    conn.commit()

    total = 0
    print(f"[seed_fire] Processing {len(files)} files (max {MAX_PER_COUNTRY} hotspots each)...")

    for f in files:
        country_name = f.stem.replace("viirs-snpp_2024_", "").replace("_", " ")
        print(f"  {country_name}...", end=" ", flush=True)
        rows = process_country(f, tree, city_ids, country_name)
        if rows:
            execute_values(cur, """
                INSERT INTO fire_detections
                  (id, city_id, latitude, longitude, brightness_ti4, frp_mw,
                   confidence, acq_date, acq_time, daynight, fire_type,
                   cluster_id, severity_score, country_name)
                VALUES %s ON CONFLICT DO NOTHING
            """, rows, page_size=500)
            conn.commit()
            total += len(rows)
            print(f"{len(rows)} hotspots")
        else:
            print("no data")

    # Update fire_risk in earth_risk from actual detections
    print("[seed_fire] Updating fire_risk scores from detections...")
    cur.execute("""
        UPDATE earth_risk er
        SET fire_risk  = LEAST(subq.weighted_severity, 0.97),
            updated_at = NOW()
        FROM (
            SELECT city_id,
                   LEAST(AVG(severity_score) * 1.6, 0.97) AS weighted_severity
            FROM fire_detections
            WHERE city_id IS NOT NULL
            GROUP BY city_id
        ) subq
        WHERE er.city_id = subq.city_id
    """)
    conn.commit()
    cur.close()
    conn.close()
    print(f"[seed_fire] Complete — {total} fire hotspots seeded across {len(files)} countries.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", nargs="+")
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()
    seed(countries=args.country, all_countries=args.all)
