import type { Request, Response, NextFunction } from 'express'
import { simulationService } from '../services/simulation.service'
import { ok } from '../types'

export async function runSimulation(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await simulationService.run(req.body)
    res.json(ok(result))
  } catch (err) {
    next(err)
  }
}

export async function getSimulationResult(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await simulationService.getBySessionId(String(req.params.sessionId))
    res.json(ok(result))
  } catch (err) {
    next(err)
  }
}

export async function getSimulationHistory(_req: Request, res: Response, next: NextFunction) {
  try {
    const history = await simulationService.getHistory()
    res.json(ok(history))
  } catch (err) {
    next(err)
  }
}
