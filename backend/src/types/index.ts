export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
export type SimulationMode = 'CURRENT' | '2030' | '2040' | '2050' | 'WORST_CASE'
export type ReportType =
  | 'EMERGENCY_BULLETIN'
  | 'GOVERNMENT_BRIEFING'
  | 'NGO_ACTION_PLAN'
  | 'CITIZEN_SAFETY_GUIDE'
  | 'DISASTER_ASSESSMENT'
  | 'CLIMATE_RISK'
  | 'INVESTOR_RISK'

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp: string
}

export function ok<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message, timestamp: new Date().toISOString() }
}

export interface DbCity {
  id: string
  name: string
  country: string
  country_code: string
  latitude: number
  longitude: number
  population: number
  admin_region: string | null
  timezone: string | null
  created_at: Date
}

export interface DbEarthRisk {
  id: string
  city_id: string
  flood_risk: number
  fire_risk: number
  climate_stress: number
  environmental_risk: number
  population_exposure: number
  emergency_readiness: number
  economic_vulnerability: number
  earthmind_risk_index: number
  risk_level: RiskLevel
  updated_at: Date
}
