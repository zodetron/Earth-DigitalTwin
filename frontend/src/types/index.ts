// ─── Risk & Earth ────────────────────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'

export interface EarthHealthScore {
  score: number
  totalCitiesMonitored: number
  criticalZones: number
  highRiskZones: number
  avgGlobalRisk: number
  computedAt: string
}

export interface EarthRisk {
  id: string
  cityId: string
  floodRisk: number
  fireRisk: number
  climateStress: number
  environmentalRisk: number
  populationExposure: number
  emergencyReadiness: number
  economicVulnerability: number
  earthmindRiskIndex: number
  riskLevel: RiskLevel
  updatedAt: string
}

// ─── City ────────────────────────────────────────────────────────────────────

export interface City {
  id: string
  name: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
  population: number
  adminRegion?: string
  timezone?: string
  risk?: EarthRisk
}

export interface CityWithRisk extends City {
  risk: EarthRisk
}

// ─── Globe ───────────────────────────────────────────────────────────────────

export type GlobeLayer = 'risk' | 'flood' | 'fire' | 'climate' | 'future' | 'disaster'
export type FutureMode = 'current' | '2030' | '2040' | '2050' | 'worst'

export interface GlobePoint {
  lat: number
  lng: number
  size: number
  color: string
  cityId?: string
  cityName?: string
  riskLevel?: RiskLevel
  riskScore?: number
}

export interface GlobeArc {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  color: string
  label?: string
}

// ─── Flood ───────────────────────────────────────────────────────────────────

export interface FloodPrediction {
  id: string
  cityId: string
  floodProbability: number
  riskLevel: RiskLevel
  shapValues: Record<string, number>
  confidence: number
  modelVersion: string
  predictedAt: string
}

export interface FloodFeatures {
  monsoonIntensity: number
  topographyDrainage: number
  riverManagement: number
  deforestation: number
  urbanization: number
  climateChange: number
  damsQuality: number
  siltation: number
  agriculturalPractices: number
  encroachments: number
  ineffectiveDisasterPreparedness: number
  drainageSystems: number
  coastalVulnerability: number
  landslides: number
  watersheds: number
  deterioratingInfrastructure: number
  populationScore: number
  wetlandLoss: number
  inadequatePlanning: number
  politicalFactors: number
}

// ─── Fire ────────────────────────────────────────────────────────────────────

export interface FireHotspot {
  id: string
  latitude: number
  longitude: number
  brightness_ti4: number
  frp_mw: number
  confidence: string
  acq_date: string
  acq_time: string
  daynight: string
  fire_type: number
  cluster_id: number
  severity_score: number
  country_name: string
  city_name?: string
}

export interface FireCluster {
  cluster_id: number
  country_name: string
  hotspot_count: number
  center_lat: number
  center_lng: number
  avg_frp: number
  max_frp: number
  max_brightness: number
  avg_severity: number
  max_severity: number
}

export interface FireCountryStat {
  country_name: string
  hotspot_count: number
  avg_frp: number
  max_frp: number
  avg_severity: number
  cluster_count: number
  critical_hotspots: number
  day_detections: number
  night_detections: number
}

export interface FireSeverityBucket {
  severity_level: RiskLevel
  count: number
  avg_frp: number
}

export interface FireFrpBucket {
  bucket: number
  frp_min: number
  frp_max: number
  count: number
}

export interface FireGlobalSummary {
  total_hotspots: string
  countries_affected: string
  active_clusters: string
  avg_frp: string
  max_frp: string
  critical_hotspots: string
  high_or_critical: string
  avg_severity: string
}

export interface FireAnalytics {
  summary: FireGlobalSummary
  countryStats: FireCountryStat[]
  clusters: FireCluster[]
  severityDist: FireSeverityBucket[]
}

// ─── Simulation ──────────────────────────────────────────────────────────────

export type SimulationMode = 'CURRENT' | '2030' | '2040' | '2050' | 'WORST_CASE'

export interface SimulationParams {
  rainfall: number
  temperature: number
  humidity: number
  wind_speed: number
  vegetation_dryness: number
  population_density: number
  mode: SimulationMode
}

export interface SimulationResult {
  session_id: string
  mode: SimulationMode
  flood_risk_sim: number
  fire_risk_sim: number
  climate_stress_sim: number
  earth_health_delta: number
  economic_loss_usd: number
  recovery_days: number
  affected_population: number
  explanation?: string
  simulated_at?: string
}

// ─── AI Reports ──────────────────────────────────────────────────────────────

export type ReportType =
  | 'EMERGENCY_BULLETIN'
  | 'GOVERNMENT_BRIEFING'
  | 'NGO_ACTION_PLAN'
  | 'CITIZEN_SAFETY_GUIDE'
  | 'DISASTER_ASSESSMENT'
  | 'CLIMATE_RISK'
  | 'INVESTOR_RISK'

export interface AIReport {
  id: string
  reportType: ReportType
  scope: 'CITY' | 'COUNTRY' | 'GLOBAL'
  scopeId?: string
  title: string
  content: string
  metadata?: Record<string, unknown>
  generatedAt: string
}

// ─── EarthGPT ────────────────────────────────────────────────────────────────

export interface EarthGPTMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  sources?: string[]
}

export interface EarthGPTQuery {
  query: string
  cityId?: string
  countryCode?: string
  context?: string
}

// ─── Agents ──────────────────────────────────────────────────────────────────

export type AgentName =
  | 'FloodIntelligence'
  | 'WildfireIntelligence'
  | 'Climate'
  | 'Simulation'
  | 'EmergencyCommander'
  | 'EconomicImpact'
  | 'EarthGPT'

export type AgentStatus = 'idle' | 'running' | 'complete' | 'error'

export interface AgentState {
  name: AgentName
  status: AgentStatus
  lastRun?: string
  result?: unknown
  error?: string
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  pageSize: number
  timestamp: string
}
