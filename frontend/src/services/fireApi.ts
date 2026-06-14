import { apiClient } from './api'
import type {
  ApiResponse,
  FireAnalytics,
  FireGlobalSummary,
  FireHotspot,
  FireCountryStat,
  FireCluster,
  FireSeverityBucket,
  FireFrpBucket,
} from '@/types'

export const fireApi = {
  getSummary: () =>
    apiClient.get<ApiResponse<FireGlobalSummary>>('/fire/summary').then((r) => r.data.data),

  getAnalytics: () =>
    apiClient.get<ApiResponse<FireAnalytics>>('/fire/analytics').then((r) => r.data.data),

  getHotspots: (limit = 2000) =>
    apiClient
      .get<ApiResponse<FireHotspot[]>>('/fire/hotspots', { params: { limit } })
      .then((r) => r.data.data),

  getCountryStats: () =>
    apiClient.get<ApiResponse<FireCountryStat[]>>('/fire/country-stats').then((r) => r.data.data),

  getClusters: (limit = 50) =>
    apiClient
      .get<ApiResponse<FireCluster[]>>('/fire/clusters', { params: { limit } })
      .then((r) => r.data.data),

  getSeverityDistribution: () =>
    apiClient
      .get<ApiResponse<FireSeverityBucket[]>>('/fire/severity-distribution')
      .then((r) => r.data.data),

  getFrpDistribution: () =>
    apiClient
      .get<ApiResponse<FireFrpBucket[]>>('/fire/frp-distribution')
      .then((r) => r.data.data),
}
