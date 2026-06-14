import { Router } from 'express'
import {
  getFireHotspots,
  getFireHotspotsByCity,
  getFireCountryStats,
  getFireClusters,
  getFireSeverityDistribution,
  getFireFrpDistribution,
  getFireGlobalSummary,
  getFireAnalytics,
} from '../controllers/fire.controller'

const router = Router()

router.get('/summary', getFireGlobalSummary)
router.get('/analytics', getFireAnalytics)
router.get('/hotspots', getFireHotspots)
router.get('/hotspots/:cityId', getFireHotspotsByCity)
router.get('/country-stats', getFireCountryStats)
router.get('/clusters', getFireClusters)
router.get('/severity-distribution', getFireSeverityDistribution)
router.get('/frp-distribution', getFireFrpDistribution)

export default router
