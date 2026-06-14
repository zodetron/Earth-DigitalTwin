import { Router } from 'express'
import {
  getFloodPredictions,
  getFloodPredictionByCity,
  getTopRiskCities,
  getRiskDistribution,
  getCountryStats,
  runFloodPrediction,
} from '../controllers/flood.controller'

const router = Router()

router.get('/predictions', getFloodPredictions)
router.get('/top-risk', getTopRiskCities)
router.get('/distribution', getRiskDistribution)
router.get('/country-stats', getCountryStats)
router.get('/predictions/:cityId', getFloodPredictionByCity)
router.post('/predict', runFloodPrediction)

export default router
