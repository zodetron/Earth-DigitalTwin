import { Router } from 'express'
import cityRoutes from './city.routes'
import earthRoutes from './earth.routes'
import floodRoutes from './flood.routes'
import fireRoutes from './fire.routes'
import simulationRoutes from './simulation.routes'
import reportRoutes from './report.routes'
import agentRoutes from './agent.routes'

const router = Router()

router.use('/cities', cityRoutes)
router.use('/earth', earthRoutes)
router.use('/flood', floodRoutes)
router.use('/fire', fireRoutes)
router.use('/simulation', simulationRoutes)
router.use('/reports', reportRoutes)
router.use('/agents', agentRoutes)

export default router
