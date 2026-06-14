import type { Request, Response, NextFunction } from 'express'
import { floodService } from '../services/flood.service'
import { ok } from '../types'

export async function getFloodPredictions(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseInt(req.query.limit as string | undefined ?? '500')
    const preds = await floodService.getLatestPredictions(limit)
    res.json(ok(preds))
  } catch (err) { next(err) }
}

export async function getFloodPredictionByCity(req: Request, res: Response, next: NextFunction) {
  try {
    const pred = await floodService.getPredictionByCity(String(req.params.cityId))
    res.json(ok(pred))
  } catch (err) { next(err) }
}

export async function getTopRiskCities(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = parseInt(req.query.limit as string | undefined ?? '20')
    const countryCode = req.query.country as string | undefined
    const cities = await floodService.getTopRiskCities(limit, countryCode)
    res.json(ok(cities))
  } catch (err) { next(err) }
}

export async function getRiskDistribution(_req: Request, res: Response, next: NextFunction) {
  try {
    const dist = await floodService.getRiskDistribution()
    res.json(ok(dist))
  } catch (err) { next(err) }
}

export async function getCountryStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await floodService.getCountryStats()
    res.json(ok(stats))
  } catch (err) { next(err) }
}

export async function runFloodPrediction(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await floodService.runPrediction(req.body)
    res.json(ok(result))
  } catch (err) { next(err) }
}
