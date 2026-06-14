import type { Request, Response, NextFunction } from 'express'
import { earthService } from '../services/earth.service'
import { ok } from '../types'

export async function getEarthHealth(_req: Request, res: Response, next: NextFunction) {
  try {
    const health = await earthService.getEarthHealth()
    res.json(ok(health))
  } catch (err) {
    next(err)
  }
}

export async function triggerScan(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await earthService.triggerScan()
    res.json(ok(result))
  } catch (err) {
    next(err)
  }
}

export async function getGlobalRisk(_req: Request, res: Response, next: NextFunction) {
  try {
    const points = await earthService.getGlobalRiskPoints()
    res.json(ok(points))
  } catch (err) {
    next(err)
  }
}
