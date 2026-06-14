-- EarthMind X — Database Schema
-- Run via: npm run db:migrate

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Cities ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  country       VARCHAR(255) NOT NULL,
  country_code  VARCHAR(10),
  iso_a2        VARCHAR(5),
  latitude      DECIMAL(10,7) NOT NULL,
  longitude     DECIMAL(10,7) NOT NULL,
  population    BIGINT,
  admin_region  VARCHAR(255),
  feature_class VARCHAR(100),
  is_capital    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cities_coords   ON cities (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_cities_country  ON cities (country_code);
CREATE INDEX IF NOT EXISTS idx_cities_name     ON cities (name);
CREATE INDEX IF NOT EXISTS idx_cities_pop      ON cities (population DESC NULLS LAST);

-- ─── Earth Risk (Digital Twin State per city) ────────────────────────────────

CREATE TABLE IF NOT EXISTS earth_risk (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id                 UUID UNIQUE NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  flood_risk              DECIMAL(5,4) NOT NULL DEFAULT 0,
  fire_risk               DECIMAL(5,4) NOT NULL DEFAULT 0,
  climate_stress          DECIMAL(5,4) NOT NULL DEFAULT 0,
  environmental_risk      DECIMAL(5,4) NOT NULL DEFAULT 0,
  population_exposure     DECIMAL(5,4) NOT NULL DEFAULT 0,
  emergency_readiness     DECIMAL(5,4) NOT NULL DEFAULT 0.5,
  economic_vulnerability  DECIMAL(5,4) NOT NULL DEFAULT 0,
  earthmind_risk_index    DECIMAL(5,4) NOT NULL DEFAULT 0,
  risk_level              VARCHAR(20) NOT NULL DEFAULT 'LOW'
                            CHECK (risk_level IN ('LOW','MODERATE','HIGH','CRITICAL')),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earth_risk_index ON earth_risk (earthmind_risk_index DESC);
CREATE INDEX IF NOT EXISTS idx_earth_risk_level ON earth_risk (risk_level);

-- ─── Flood Predictions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flood_predictions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id               UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  flood_probability     DECIMAL(5,4) NOT NULL,
  risk_level            VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW','MODERATE','HIGH','CRITICAL')),
  monsoon_intensity     DECIMAL(4,2),
  urbanization_score    DECIMAL(4,2),
  deforestation_score   DECIMAL(4,2),
  climate_change_score  DECIMAL(4,2),
  population_score      DECIMAL(4,2),
  shap_values           JSONB,
  top_factors           JSONB,
  confidence            DECIMAL(5,4),
  model_version         VARCHAR(20) DEFAULT 'v1',
  predicted_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flood_city_time ON flood_predictions (city_id, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_flood_prob      ON flood_predictions (flood_probability DESC);

-- ─── Fire Detections (from VIIRS) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fire_detections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id         UUID REFERENCES cities(id),
  latitude        DECIMAL(10,7) NOT NULL,
  longitude       DECIMAL(10,7) NOT NULL,
  brightness_ti4  DECIMAL(8,2),
  frp_mw          DECIMAL(10,3),
  confidence      VARCHAR(5),
  acq_date        DATE NOT NULL,
  acq_time        VARCHAR(6),
  daynight        CHAR(1),
  fire_type       SMALLINT DEFAULT 0,
  cluster_id      INTEGER,
  severity_score  DECIMAL(5,4) DEFAULT 0,
  country_name    VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fire_location ON fire_detections (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_fire_date     ON fire_detections (acq_date DESC);
CREATE INDEX IF NOT EXISTS idx_fire_city     ON fire_detections (city_id);
CREATE INDEX IF NOT EXISTS idx_fire_severity ON fire_detections (severity_score DESC);

-- ─── Simulation Results ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS simulation_results (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID NOT NULL,
  mode                  VARCHAR(30) NOT NULL,
  city_id               UUID REFERENCES cities(id),
  input_params          JSONB NOT NULL DEFAULT '{}',
  flood_risk_sim        DECIMAL(5,4),
  fire_risk_sim         DECIMAL(5,4),
  climate_stress_sim    DECIMAL(5,4),
  economic_loss_usd     DECIMAL(18,2),
  recovery_days         INTEGER,
  affected_population   BIGINT,
  earth_health_delta    DECIMAL(6,2),
  explanation           TEXT,
  simulated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_session  ON simulation_results (session_id);
CREATE INDEX IF NOT EXISTS idx_sim_time     ON simulation_results (simulated_at DESC);

-- ─── AI Reports ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type   VARCHAR(60) NOT NULL,
  scope         VARCHAR(20) NOT NULL DEFAULT 'GLOBAL',
  scope_id      VARCHAR(100),
  title         VARCHAR(500) NOT NULL,
  content       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  generated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_type ON ai_reports (report_type, generated_at DESC);

-- ─── Prediction History ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prediction_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id         UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  prediction_type VARCHAR(20) NOT NULL CHECK (prediction_type IN ('FLOOD','FIRE','CLIMATE')),
  risk_score      DECIMAL(5,4) NOT NULL,
  risk_level      VARCHAR(20) NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_city_type ON prediction_history (city_id, prediction_type, recorded_at DESC);
