import fs from 'fs'
import path from 'path'
import { pool } from '../config/db'
import { logger } from '../config/logger'

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
  logger.info('Running EarthMind X database migration...')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    logger.info('Migration complete.')
  } catch (err) {
    await client.query('ROLLBACK')
    logger.error('Migration failed', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((e) => {
  console.error(e)
  process.exit(1)
})
