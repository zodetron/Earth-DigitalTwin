import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
const AI_BASE = import.meta.env.VITE_AI_SERVICE_URL ?? 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

export const aiClient = axios.create({
  baseURL: `${AI_BASE}/ai`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message ?? err.message
    return Promise.reject(new Error(msg))
  }
)

aiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail ?? err.message
    return Promise.reject(new Error(msg))
  }
)
