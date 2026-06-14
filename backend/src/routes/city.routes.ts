import { Router } from 'express'
import { getCities, getCityById, searchCities } from '../controllers/city.controller'

const router = Router()

router.get('/', getCities)
router.get('/search', searchCities)
router.get('/:id', getCityById)

export default router
