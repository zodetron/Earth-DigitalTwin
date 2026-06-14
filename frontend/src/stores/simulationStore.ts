import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { SimulationParams, SimulationResult, SimulationMode } from '@/types'

interface SimulationStore {
  params: SimulationParams
  result: SimulationResult | null
  isRunning: boolean
  history: SimulationResult[]

  setParam: <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => void
  setMode: (mode: SimulationMode) => void
  setResult: (result: SimulationResult) => void
  setRunning: (running: boolean) => void
  resetParams: () => void
}

const defaultParams: SimulationParams = {
  rainfall: 50,
  temperature: 25,
  humidity: 60,
  wind_speed: 20,
  vegetation_dryness: 40,
  population_density: 50,
  mode: 'CURRENT',
}

export const useSimulationStore = create<SimulationStore>()(
  devtools(
    (set) => ({
      params: defaultParams,
      result: null,
      isRunning: false,
      history: [],

      setParam: (key, value) =>
        set((s) => ({ params: { ...s.params, [key]: value } })),

      setMode: (mode) =>
        set((s) => ({ params: { ...s.params, mode } })),

      setResult: (result) =>
        set((s) => ({ result, history: [result, ...s.history].slice(0, 20) })),

      setRunning: (running) => set({ isRunning: running }),

      resetParams: () => set({ params: defaultParams, result: null }),
    }),
    { name: 'simulation-store' }
  )
)
