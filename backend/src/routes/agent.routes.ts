import { Router } from 'express'
import { queryEarthGPT, generateEmergencyPlan, getEconomicImpact } from '../controllers/agent.controller'

const router = Router()

router.post('/earthgpt', queryEarthGPT)
router.post('/emergency-plan', generateEmergencyPlan)
router.post('/economic-impact', getEconomicImpact)

export default router
