import { Router } from 'express'
import { runSimulation, getSimulationResult, getSimulationHistory } from '../controllers/simulation.controller'

const router = Router()

router.post('/run', runSimulation)
router.get('/history', getSimulationHistory)
router.get('/:sessionId', getSimulationResult)

export default router
