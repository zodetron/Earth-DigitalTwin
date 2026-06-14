import { query, queryOne } from '../config/db'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import { env } from '../config/env'

export const simulationService = {
  run: async (params: Record<string, unknown>) => {
    const sessionId = uuidv4()

    const { data } = await axios.post(`${env.AI_SERVICE_URL}/ai/simulation/run`, {
      ...params,
      session_id: sessionId,
    })

    // Persist result to DB
    await queryOne(`
      INSERT INTO simulation_results (
        session_id, mode, input_params,
        flood_risk_sim, fire_risk_sim, climate_stress_sim,
        earth_health_delta, economic_loss_usd,
        recovery_days, affected_population, explanation
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id
    `, [
      sessionId,
      data.mode ?? params.mode ?? 'CURRENT',
      JSON.stringify(params),
      data.flood_risk_sim,
      data.fire_risk_sim,
      data.climate_stress_sim,
      data.earth_health_delta,
      data.economic_loss_usd,
      data.recovery_days,
      data.affected_population,
      data.explanation,
    ])

    return { sessionId, ...data }
  },

  getBySessionId: async (sessionId: string) => {
    return queryOne(`
      SELECT * FROM simulation_results WHERE session_id = $1
    `, [sessionId])
  },

  getHistory: async () => {
    return query(`
      SELECT
        id, session_id, mode,
        flood_risk_sim, fire_risk_sim, climate_stress_sim,
        earth_health_delta, economic_loss_usd,
        recovery_days, affected_population, explanation,
        simulated_at
      FROM simulation_results
      ORDER BY simulated_at DESC
      LIMIT 20
    `)
  },
}
