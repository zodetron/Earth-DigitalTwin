import { Router } from 'express'
import { getEarthHealth, triggerScan, getGlobalRisk } from '../controllers/earth.controller'

const router = Router()

router.get('/health', getEarthHealth)
router.post('/scan', triggerScan)
router.get('/risk/global', getGlobalRisk)

export default router
