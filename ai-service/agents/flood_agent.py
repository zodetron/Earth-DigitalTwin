"""Flood Intelligence Agent — XGBoost + SHAP"""
import os
import numpy as np
import pandas as pd
import joblib
import shap
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score
import xgboost as xgb

FEATURE_COLS = [
    "MonsoonIntensity", "TopographyDrainage", "RiverManagement", "Deforestation",
    "Urbanization", "ClimateChange", "DamsQuality", "Siltation", "AgriculturalPractices",
    "Encroachments", "IneffectiveDisasterPreparedness", "DrainageSystems",
    "CoastalVulnerability", "Landslides", "Watersheds", "DeterioratingInfrastructure",
    "PopulationScore", "WetlandLoss", "InadequatePlanning", "PoliticalFactors",
]
TARGET = "FloodProbability"
MODEL_PATH = Path(__file__).parent.parent / "models" / "flood_model.joblib"
SCALER_PATH = Path(__file__).parent.parent / "models" / "flood_scaler.joblib"


def _risk_level(prob: float) -> str:
    if prob >= 0.75: return "CRITICAL"
    if prob >= 0.5:  return "HIGH"
    if prob >= 0.25: return "MODERATE"
    return "LOW"


class FloodAgent:
    def __init__(self):
        self.model: xgb.XGBRegressor | None = None
        self.scaler: StandardScaler | None = None
        self.explainer: shap.TreeExplainer | None = None
        self._load_or_train()

    def _load_or_train(self):
        if MODEL_PATH.exists() and SCALER_PATH.exists():
            self.model = joblib.load(MODEL_PATH)
            self.scaler = joblib.load(SCALER_PATH)
            self.explainer = shap.TreeExplainer(self.model)
            return

        datasets_path = Path(os.getenv("DATASETS_PATH", "../datasets"))
        train_csv = datasets_path / "flood" / "train.csv" / "train.csv"
        if not train_csv.exists():
            raise FileNotFoundError(f"Flood training data not found at {train_csv}")

        df = pd.read_csv(train_csv)
        X = df[FEATURE_COLS].values.astype(np.float32)
        y = df[TARGET].values.astype(np.float32)

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

        self.scaler = StandardScaler()
        X_train_s = self.scaler.fit_transform(X_train)
        X_test_s = self.scaler.transform(X_test)

        self.model = xgb.XGBRegressor(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(
            X_train_s, y_train,
            eval_set=[(X_test_s, y_test)],
            verbose=False,
        )

        mae = mean_absolute_error(y_test, self.model.predict(X_test_s))
        r2 = r2_score(y_test, self.model.predict(X_test_s))
        print(f"[FloodAgent] Trained — MAE: {mae:.4f}, R²: {r2:.4f}")

        MODEL_PATH.parent.mkdir(exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)
        self.explainer = shap.TreeExplainer(self.model)

    def predict(self, features: dict) -> dict:
        feature_map = {
            "monsoon_intensity": "MonsoonIntensity",
            "topography_drainage": "TopographyDrainage",
            "river_management": "RiverManagement",
            "deforestation": "Deforestation",
            "urbanization": "Urbanization",
            "climate_change": "ClimateChange",
            "dams_quality": "DamsQuality",
            "siltation": "Siltation",
            "agricultural_practices": "AgriculturalPractices",
            "encroachments": "Encroachments",
            "ineffective_disaster_preparedness": "IneffectiveDisasterPreparedness",
            "drainage_systems": "DrainageSystems",
            "coastal_vulnerability": "CoastalVulnerability",
            "landslides": "Landslides",
            "watersheds": "Watersheds",
            "deteriorating_infrastructure": "DeterioratingInfrastructure",
            "population_score": "PopulationScore",
            "wetland_loss": "WetlandLoss",
            "inadequate_planning": "InadequatePlanning",
            "political_factors": "PoliticalFactors",
        }

        row = [features.get(k, 5.0) for k in feature_map.keys()]
        X = np.array([row], dtype=np.float32)
        X_s = self.scaler.transform(X)

        prob = float(np.clip(self.model.predict(X_s)[0], 0, 1))
        shap_vals = self.explainer.shap_values(X_s)[0]

        shap_dict = {
            list(feature_map.keys())[i]: float(shap_vals[i])
            for i in range(len(shap_vals))
        }
        top_factors = sorted(
            [{"factor": k, "impact": v} for k, v in shap_dict.items()],
            key=lambda x: abs(x["impact"]),
            reverse=True,
        )[:5]

        return {
            "flood_probability": round(prob, 4),
            "risk_level": _risk_level(prob),
            "confidence": round(min(0.99, 0.7 + abs(prob - 0.5) * 0.6), 3),
            "shap_values": {k: round(v, 5) for k, v in shap_dict.items()},
            "top_factors": top_factors,
            "model_version": "v1",
        }


_agent: FloodAgent | None = None


def get_flood_agent() -> FloodAgent:
    global _agent
    if _agent is None:
        _agent = FloodAgent()
    return _agent
