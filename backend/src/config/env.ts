import dotenv from 'dotenv'
dotenv.config()

function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback
  if (!val) throw new Error(`Missing env var: ${key}`)
  return val
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '3001', 10),
  DATABASE_URL: requireEnv('DATABASE_URL'),
  AI_SERVICE_URL: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
}
