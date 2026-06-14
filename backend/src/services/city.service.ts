import { query, queryOne } from '../config/db'
import { AppError } from '../middleware/errorHandler'

export const cityService = {
  getCities: async (page: number, pageSize: number) => {
    const offset = (page - 1) * pageSize
    const [rows, countRow] = await Promise.all([
      query<Record<string, unknown>>(`
        SELECT c.*, row_to_json(er.*) AS risk
        FROM cities c
        LEFT JOIN earth_risk er ON c.id = er.city_id
        ORDER BY er.earthmind_risk_index DESC NULLS LAST
        LIMIT $1 OFFSET $2
      `, [pageSize, offset]),
      queryOne<{ count: string }>('SELECT COUNT(*)::text AS count FROM cities'),
    ])
    return {
      data: rows,
      total: parseInt(countRow?.count ?? '0'),
      page,
      pageSize,
    }
  },

  getCityById: async (id: string) => {
    const row = await queryOne<Record<string, unknown>>(`
      SELECT c.*, row_to_json(er.*) AS risk
      FROM cities c
      LEFT JOIN earth_risk er ON c.id = er.city_id
      WHERE c.id = $1
    `, [id])
    if (!row) throw new AppError('City not found', 404)
    return row
  },

  searchCities: async (q: string) => {
    if (!q || q.length < 2) return []
    const rows = await query<Record<string, unknown>>(`
      SELECT c.*, row_to_json(er.*) AS risk
      FROM cities c
      LEFT JOIN earth_risk er ON c.id = er.city_id
      WHERE c.name ILIKE $1 OR c.country ILIKE $1
      ORDER BY c.population DESC NULLS LAST
      LIMIT 20
    `, [`%${q}%`])
    return rows
  },
}
