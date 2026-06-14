import { apiClient, aiClient } from './api'
import type { ApiResponse, EarthGPTQuery, AIReport, ReportType } from '@/types'

export const agentApi = {
  queryEarthGPT: (payload: EarthGPTQuery) =>
    aiClient
      .post<{ answer: string; sources: string[]; confidence: number }>('/earthgpt/query', payload)
      .then((r) => r.data),

  generateReport: (reportType: ReportType, scope: string, scopeId?: string) =>
    apiClient
      .post<ApiResponse<AIReport>>('/reports/generate', { reportType, scope, scopeId })
      .then((r) => r.data.data),

  getReports: (reportType?: ReportType) =>
    apiClient
      .get<ApiResponse<AIReport[]>>('/reports', { params: { type: reportType } })
      .then((r) => r.data.data),

  generateEmergencyPlan: (cityId: string) =>
    aiClient
      .post<{ plan: string; priorities: string[]; resources: string[] }>('/emergency/plan', { city_id: cityId })
      .then((r) => r.data),

  getEconomicImpact: (cityId: string) =>
    aiClient
      .post<{ loss_usd: number; recovery_days: number; recovery_cost_usd: number }>('/economic/impact', {
        city_id: cityId,
      })
      .then((r) => r.data),
}
