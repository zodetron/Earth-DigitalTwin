"""Wildfire Intelligence Agent — VIIRS DBSCAN Clustering + FRP Severity Scoring"""
import os
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import MinMaxScaler
from typing import Optional


DATASETS_PATH = Path(os.getenv("DATASETS_PATH", "../datasets"))
VIIRS_DIR = DATASETS_PATH / "wildfire" / "2024"


def _risk_level(score: float) -> str:
    if score >= 0.75: return "CRITICAL"
    if score >= 0.5:  return "HIGH"
    if score >= 0.25: return "MODERATE"
    return "LOW"


def _confidence_to_num(c: str) -> float:
    return {"l": 0.3, "n": 0.6, "h": 0.9}.get(str(c).lower(), 0.5)


class FireAgent:
    def load_country(self, country: str) -> Optional[pd.DataFrame]:
        path = VIIRS_DIR / f"viirs-snpp_2024_{country}.csv"
        if not path.exists():
            return None
        df = pd.read_csv(path, low_memory=False)
        df = df.rename(columns=str.lower)
        df["frp"] = pd.to_numeric(df["frp"], errors="coerce").fillna(0)
        df["bright_ti4"] = pd.to_numeric(df["bright_ti4"], errors="coerce").fillna(300)
        df["confidence_num"] = df["confidence"].apply(_confidence_to_num)
        return df

    def cluster_and_score(self, df: pd.DataFrame, eps_km: float = 50.0) -> dict:
        if df.empty:
            return {"total_hotspots": 0, "clusters": [], "avg_frp": 0, "max_frp": 0}

        coords = df[["latitude", "longitude"]].values.astype(float)
        eps_rad = eps_km / 6371.0

        labels = DBSCAN(eps=eps_rad, min_samples=3, algorithm="ball_tree", metric="haversine").fit_predict(
            np.radians(coords)
        )
        df = df.copy()
        df["cluster_id"] = labels

        clusters = []
        for cid in sorted(set(labels)):
            if cid == -1:
                continue
            sub = df[df["cluster_id"] == cid]
            avg_frp = float(sub["frp"].mean())
            max_bright = float(sub["bright_ti4"].max())
            count = len(sub)

            # severity = weighted combination of FRP, brightness, count
            severity = float(np.clip(
                0.4 * min(avg_frp / 100, 1.0)
                + 0.3 * min((max_bright - 300) / 100, 1.0)
                + 0.3 * min(count / 50, 1.0),
                0, 1
            ))

            clusters.append({
                "cluster_id": int(cid),
                "center_lat": round(float(sub["latitude"].mean()), 5),
                "center_lng": round(float(sub["longitude"].mean()), 5),
                "hotspot_count": count,
                "avg_frp": round(avg_frp, 2),
                "max_brightness": round(max_bright, 2),
                "severity_score": round(severity, 4),
                "risk_level": _risk_level(severity),
            })

        return {
            "total_hotspots": len(df),
            "clusters": sorted(clusters, key=lambda x: x["severity_score"], reverse=True),
            "avg_frp": round(float(df["frp"].mean()), 2),
            "max_frp": round(float(df["frp"].max()), 2),
        }

    def analyze_country(self, country: str, start_date=None, end_date=None) -> dict:
        df = self.load_country(country)
        if df is None:
            return {"error": f"No data for country: {country}"}

        if start_date:
            df = df[df["acq_date"] >= str(start_date)]
        if end_date:
            df = df[df["acq_date"] <= str(end_date)]

        result = self.cluster_and_score(df)
        result["country"] = country
        return result

    def get_hotspots_near(self, lat: float, lng: float, radius_km: float = 100) -> list[dict]:
        """Return raw hotspots within radius of a point (across all country files)."""
        results = []
        if not VIIRS_DIR.exists():
            return results

        earth_radius = 6371.0
        lat_r, lng_r = np.radians(lat), np.radians(lng)

        for f in VIIRS_DIR.glob("*.csv"):
            try:
                df = pd.read_csv(f, low_memory=False)
                df = df.rename(columns=str.lower)
                df["frp"] = pd.to_numeric(df.get("frp", 0), errors="coerce").fillna(0)
                lats = np.radians(df["latitude"].astype(float))
                lngs = np.radians(df["longitude"].astype(float))
                dlat, dlng = lats - lat_r, lngs - lng_r
                a = np.sin(dlat / 2) ** 2 + np.cos(lat_r) * np.cos(lats) * np.sin(dlng / 2) ** 2
                dist = 2 * earth_radius * np.arcsin(np.sqrt(a))
                nearby = df[dist <= radius_km]
                results.extend(nearby.head(200).to_dict("records"))
            except Exception:
                continue
        return results


_agent: FireAgent | None = None


def get_fire_agent() -> FireAgent:
    global _agent
    if _agent is None:
        _agent = FireAgent()
    return _agent
