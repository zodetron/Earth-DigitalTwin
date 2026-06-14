import morgan from 'morgan'
import { logger } from '../config/logger'

const stream = {
  write: (msg: string) => logger.http(msg.trim()),
}

export const requestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream }
)
