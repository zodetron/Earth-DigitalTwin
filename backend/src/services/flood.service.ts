import { query, queryOne } from '../config/db'
import axios from 'axios'
import { env } from '../config/env'

export const floodService = {
  getLatestPredictions: async (limit = 500) => {
    return query(`
      SELECT fp.id, fp.flood_probability, fp.risk_level, fp.confidence,
             fp.shap_values, fp.top_factors, fp.predicted_at,
             c.id AS city_id, c.name AS city_name, c.country,
             c.latitude, c.longitude, c.population
      FROM flood_predictions fp
      JOIN cities c ON c.id = fp.city_id
      ORDER BY fp.flood_probability DESC
      LIMIT $1
    `, [limit])
  },

  getPredictionByCity: async (cityId: string) => {
    return queryOne(`
      SELECT fp.*, c.name AS city_name, c.country,
             c.latitude, c.longitude, c.population
      FROM flood_predictions fp
      JOIN cities c ON c.id = fp.city_id
      WHERE fp.city_id = $1
      ORDER BY fp.predicted_at DESC
      LIMIT 1
    `, [cityId])
  },

  getTopRiskCities: async (limit = 20, countryCode?: string) => {
    const whereClause = countryCode ? `AND c.country_code = $2` : ''
    const params: unknown[] = countryCode ? [limit, countryCode] : [limit]
    return query(`
      SELECT fp.flood_probability, fp.risk_level, fp.confidence, fp.top_factors,
             c.id AS city_id, c.name AS city_name, c.country, c.country_code,
             c.latitude, c.longitude, c.population,
             er.earthmind_risk_index
      FROM flood_predictions fp
      JOIN cities c ON c.id = fp.city_id
      JOIN earth_risk er ON er.city_id = c.id
      WHERE 1=1 ${whereClause}
      ORDER BY fp.flood_probability DESC
      LIMIT $1
    `, params)
  },

  getRiskDistribution: async () => {
    return query(`
      SELECT risk_level,
             COUNT(*) AS count,
             ROUND(AVG(flood_probability), 4) AS avg_probability,
             ROUND(MAX(flood_probability), 4) AS max_probability
      FROM flood_predictions fp
      GROUP BY risk_level
      ORDER BY CASE risk_level
        WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MODERATE' THEN 3 ELSE 4
      END
    `)
  },

  getCountryStats: async () => {
    return query(`
      SELECT c.country, c.country_code,
             COUNT(*) AS city_count,
             ROUND(AVG(fp.flood_probability), 4) AS avg_flood_risk,
             MAX(fp.flood_probability) AS max_flood_risk,
             COUNT(*) FILTER (WHERE fp.risk_level IN ('HIGH','CRITICAL')) AS high_risk_cities
      FROM flood_predictions fp
      JOIN cities c ON c.id = fp.city_id
      GROUP BY c.country, c.country_code
      ORDER BY avg_flood_risk DESC
      LIMIT 30
    `)
  },

  runPrediction: async (body: unknown) => {
    const { data } = await axios.post(`${env.AI_SERVICE_URL}/ai/flood/predict`, body)
    return data
  },
}
