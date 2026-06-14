import { query, queryOne } from '../config/db'
import { aiProxyService } from './aiProxy.service'

export const earthService = {
  getEarthHealth: async () => {
    const row = await queryOne<{
      earth_health_score: string
      total_cities_monitored: string
      critical_zones: string
      high_risk_zones: string
      avg_global_risk: string
      computed_at: Date
    }>(`
      SELECT
        ROUND((1 - AVG(earthmind_risk_index)) * 100, 1)::text AS earth_health_score,
        COUNT(*)::text AS total_cities_monitored,
        COUNT(*) FILTER (WHERE risk_level = 'CRITICAL')::text AS critical_zones,
        COUNT(*) FILTER (WHERE risk_level = 'HIGH')::text AS high_risk_zones,
        ROUND(AVG(earthmind_risk_index), 4)::text AS avg_global_risk,
        NOW() AS computed_at
      FROM earth_risk
    `)
    return {
      score: parseFloat(row?.earth_health_score ?? '82'),
      totalCitiesMonitored: parseInt(row?.total_cities_monitored ?? '0'),
      criticalZones: parseInt(row?.critical_zones ?? '0'),
      highRiskZones: parseInt(row?.high_risk_zones ?? '0'),
      avgGlobalRisk: parseFloat(row?.avg_global_risk ?? '0'),
      computedAt: row?.computed_at?.toISOString() ?? new Date().toISOString(),
    }
  },

  getGlobalRiskPoints: async () => {
    const rows = await query<{
      city_id: string
      city_name: string
      latitude: string
      longitude: string
      earthmind_risk_index: string
      risk_level: string
    }>(`
      SELECT c.id AS city_id, c.name AS city_name,
             c.latitude, c.longitude,
             er.earthmind_risk_index, er.risk_level
      FROM cities c
      JOIN earth_risk er ON c.id = er.city_id
      ORDER BY er.earthmind_risk_index DESC
      LIMIT 2000
    `)

    return rows.map((r) => ({
      lat: parseFloat(r.latitude),
      lng: parseFloat(r.longitude),
      cityId: r.city_id,
      cityName: r.city_name,
      riskScore: parseFloat(r.earthmind_risk_index),
      riskLevel: r.risk_level,
      size: 0.3 + parseFloat(r.earthmind_risk_index) * 0.7,
      color: riskLevelToColor(r.risk_level),
    }))
  },

  triggerScan: async () => {
    const result = await aiProxyService.runScan()
    return { message: 'Earth scan complete', citiesScanned: result?.cities_scanned ?? 0 }
  },
}

function riskLevelToColor(level: string): string {
  const map: Record<string, string> = {
    LOW: '#00ff88',
    MODERATE: '#ffcc00',
    HIGH: '#ff6600',
    CRITICAL: '#ff0033',
  }
  return map[level] ?? '#00d4ff'
}
