import { Router } from 'express'
import { generateReport, getReports, getReportById } from '../controllers/report.controller'

const router = Router()

router.post('/generate', generateReport)
router.get('/', getReports)
router.get('/:id', getReportById)

export default router
