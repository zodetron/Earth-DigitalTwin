import type { Request, Response, NextFunction } from 'express'
import { aiProxyService } from '../services/aiProxy.service'
import { ok } from '../types'

export async function queryEarthGPT(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await aiProxyService.queryEarthGPT(req.body)
    res.json(ok(result))
  } catch (err) {
    next(err)
  }
}

export async function generateEmergencyPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await aiProxyService.generateEmergencyPlan(req.body.cityId)
    res.json(ok(result))
  } catch (err) {
    next(err)
  }
}

export async function getEconomicImpact(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await aiProxyService.getEconomicImpact(req.body.cityId)
    res.json(ok(result))
  } catch (err) {
    next(err)
  }
}
