import type { Request, Response, NextFunction } from 'express'
import { cityService } from '../services/city.service'
import { ok } from '../types'

export async function getCities(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string | undefined ?? '1')
    const pageSize = parseInt(req.query.pageSize as string | undefined ?? '50')
    const result = await cityService.getCities(page, pageSize)
    res.json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (err) {
    next(err)
  }
}

export async function getCityById(req: Request, res: Response, next: NextFunction) {
  try {
    const city = await cityService.getCityById(String(req.params.id))
    res.json(ok(city))
  } catch (err) {
    next(err)
  }
}

export async function searchCities(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string | undefined) ?? ''
    const cities = await cityService.searchCities(q)
    res.json(ok(cities))
  } catch (err) {
    next(err)
  }
}
