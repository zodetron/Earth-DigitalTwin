import type { Request, Response, NextFunction } from 'express'
import { fireService } from '../services/fire.service'
import { ok } from '../types'

export async function getFireHotspots(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseInt((req.query.limit as string | undefined) ?? '2000')
    const hotspots = await fireService.getActiveHotspots(limit)
    res.json(ok(hotspots))
  } catch (err) { next(err) }
}

export async function getFireHotspotsByCity(req: Request, res: Response, next: NextFunction) {
  try {
    const hotspots = await fireService.getHotspotsByCity(String(req.params.cityId))
    res.json(ok(hotspots))
  } catch (err) { next(err) }
}

export async function getFireCountryStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await fireService.getCountryStats()
    res.json(ok(stats))
  } catch (err) { next(err) }
}

export async function getFireClusters(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseInt((req.query.limit as string | undefined) ?? '50')
    const clusters = await fireService.getClusters(limit)
    res.json(ok(clusters))
  } catch (err) { next(err) }
}

export async function getFireSeverityDistribution(_req: Request, res: Response, next: NextFunction) {
  try {
    const dist = await fireService.getSeverityDistribution()
    res.json(ok(dist))
  } catch (err) { next(err) }
}

export async function getFireFrpDistribution(_req: Request, res: Response, next: NextFunction) {
  try {
    const dist = await fireService.getFrpDistribution()
    res.json(ok(dist))
  } catch (err) { next(err) }
}

export async function getFireGlobalSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await fireService.getGlobalSummary()
    res.json(ok(summary))
  } catch (err) { next(err) }
}

export async function getFireAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    const analytics = await fireService.getGlobalAnalytics()
    res.json(ok(analytics))
  } catch (err) { next(err) }
}
