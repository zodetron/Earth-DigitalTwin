import type { Request, Response, NextFunction } from 'express'
import { reportService } from '../services/report.service'
import { ok } from '../types'

export async function generateReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { reportType, scope, scopeId } = req.body
    const report = await reportService.generate(reportType, scope, scopeId)
    res.json(ok(report))
  } catch (err) {
    next(err)
  }
}

export async function getReports(req: Request, res: Response, next: NextFunction) {
  try {
    const reports = await reportService.getAll(req.query.type as string | undefined)
    res.json(ok(reports))
  } catch (err) {
    next(err)
  }
}

export async function getReportById(req: Request, res: Response, next: NextFunction) {
  try {
    const report = await reportService.getById(String(req.params.id))
    res.json(ok(report))
  } catch (err) {
    next(err)
  }
}
