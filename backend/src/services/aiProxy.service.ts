import axios from 'axios'
import { env } from '../config/env'
import { logger } from '../config/logger'

const aiClient = axios.create({
  baseURL: `${env.AI_SERVICE_URL}/ai`,
  timeout: 60000,
})

export const aiProxyService = {
  queryEarthGPT: async (payload: unknown) => {
    const { data } = await aiClient.post('/earthgpt/query', payload)
    return data
  },
  generateEmergencyPlan: async (cityId: string) => {
    const { data } = await aiClient.post('/emergency/plan', { city_id: cityId })
    return data
  },
  getEconomicImpact: async (cityId: string) => {
    const { data } = await aiClient.post('/economic/impact', { city_id: cityId })
    return data
  },
  runScan: async () => {
    logger.info('Triggering full Earth scan via AI service')
    const { data } = await aiClient.post('/scan/earth')
    return data
  },
}
