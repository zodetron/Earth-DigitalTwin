import { apiClient } from './api'
import type { ApiResponse, SimulationParams, SimulationResult } from '@/types'

export const simulationApi = {
  run: (params: SimulationParams) =>
    apiClient
      .post<ApiResponse<SimulationResult>>('/simulation/run', params)
      .then((r) => r.data.data),

  getResult: (sessionId: string) =>
    apiClient
      .get<ApiResponse<SimulationResult>>(`/simulation/${sessionId}`)
      .then((r) => r.data.data),

  getHistory: () =>
    apiClient.get<ApiResponse<SimulationResult[]>>('/simulation/history').then((r) => r.data.data),
}
