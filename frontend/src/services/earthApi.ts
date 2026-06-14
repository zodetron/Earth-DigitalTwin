import { apiClient } from './api'
import type { ApiResponse, EarthHealthScore, CityWithRisk, GlobePoint, PaginatedResponse } from '@/types'

export const earthApi = {
  getHealth: () =>
    apiClient.get<ApiResponse<EarthHealthScore>>('/earth/health').then((r) => r.data.data),

  triggerScan: () =>
    apiClient.post<ApiResponse<{ message: string; citiesScanned: number }>>('/earth/scan').then((r) => r.data.data),

  getGlobePoints: () =>
    apiClient.get<ApiResponse<GlobePoint[]>>('/earth/risk/global').then((r) => r.data.data),

  getCities: (page = 1, pageSize = 50, search?: string) =>
    apiClient
      .get<PaginatedResponse<CityWithRisk>>('/cities', { params: { page, pageSize, q: search } })
      .then((r) => r.data),

  getCity: (id: string) =>
    apiClient.get<ApiResponse<CityWithRisk>>(`/cities/${id}`).then((r) => r.data.data),

  searchCity: (q: string) =>
    apiClient.get<ApiResponse<CityWithRisk[]>>('/cities/search', { params: { q } }).then((r) => r.data.data),
}
