import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { env } from './config/env'
import { logger } from './config/logger'
import { requestLogger } from './middleware/requestLogger'
import { errorHandler } from './middleware/errorHandler'
import router from './routes'

const app = express()

app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(requestLogger)

app.use(
  rateLimit({
    windowMs: 60_000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'earthmind-x-backend', timestamp: new Date().toISOString() })
})

app.use('/api/v1', router)
app.use(errorHandler)

app.listen(env.PORT, () => {
  logger.info(`EarthMind X Backend running on port ${env.PORT}`)
})

export default app
