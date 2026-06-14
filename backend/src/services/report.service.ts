import { query, queryOne } from '../config/db'
import { AppError } from '../middleware/errorHandler'
import { aiProxyService } from './aiProxy.service'
import { v4 as uuidv4 } from 'uuid'

export const reportService = {
  generate: async (reportType: string, scope: string, scopeId?: string) => {
    const result = await aiProxyService.queryEarthGPT({
      query: `Generate a ${reportType} report for scope: ${scope}${scopeId ? ` (${scopeId})` : ''}`,
      context: 'report_generation',
    })

    const id = uuidv4()
    await query(
      `INSERT INTO ai_reports (id, report_type, scope, scope_id, title, content, generated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [id, reportType, scope, scopeId ?? null, `${reportType} — ${new Date().toISOString()}`, result?.answer ?? '']
    )
    return { id, reportType, scope, scopeId, content: result?.answer }
  },

  getAll: async (reportType?: string) => {
    if (reportType) {
      return query('SELECT * FROM ai_reports WHERE report_type = $1 ORDER BY generated_at DESC LIMIT 50', [reportType])
    }
    return query('SELECT * FROM ai_reports ORDER BY generated_at DESC LIMIT 50')
  },

  getById: async (id: string) => {
    const row = await queryOne('SELECT * FROM ai_reports WHERE id = $1', [id])
    if (!row) throw new AppError('Report not found', 404)
    return row
  },
}
