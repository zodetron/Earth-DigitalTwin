import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  City,
  EarthHealthScore,
  GlobeLayer,
  FutureMode,
  GlobePoint,
  GlobeArc,
  FireHotspot,
  FloodPrediction,
} from '@/types'

interface EarthStore {
  // Globe state
  activeLayer: GlobeLayer
  futureMode: FutureMode
  isScanning: boolean
  isRotating: boolean
  selectedCity: City | null

  // Data
  earthHealth: EarthHealthScore | null
  globePoints: GlobePoint[]
  globeArcs: GlobeArc[]
  fireHotspots: FireHotspot[]
  floodPredictions: FloodPrediction[]

  // UI
  showAtmosphere: boolean
  showClouds: boolean
  showNightSide: boolean
  globeAutoRotate: boolean

  // Actions
  setActiveLayer: (layer: GlobeLayer) => void
  setFutureMode: (mode: FutureMode) => void
  setSelectedCity: (city: City | null) => void
  setEarthHealth: (health: EarthHealthScore) => void
  setGlobePoints: (points: GlobePoint[]) => void
  setGlobeArcs: (arcs: GlobeArc[]) => void
  setFireHotspots: (hotspots: FireHotspot[]) => void
  setFloodPredictions: (preds: FloodPrediction[]) => void
  startScan: () => void
  stopScan: () => void
  toggleRotation: () => void
  toggleLayer: (key: 'showAtmosphere' | 'showClouds' | 'showNightSide' | 'globeAutoRotate') => void
}

export const useEarthStore = create<EarthStore>()(
  devtools(
    (set) => ({
      activeLayer: 'risk',
      futureMode: 'current',
      isScanning: false,
      isRotating: true,
      selectedCity: null,
      earthHealth: null,
      globePoints: [],
      globeArcs: [],
      fireHotspots: [],
      floodPredictions: [],
      showAtmosphere: true,
      showClouds: true,
      showNightSide: true,
      globeAutoRotate: true,

      setActiveLayer: (layer) => set({ activeLayer: layer }),
      setFutureMode: (mode) => set({ futureMode: mode }),
      setSelectedCity: (city) => set({ selectedCity: city }),
      setEarthHealth: (health) => set({ earthHealth: health }),
      setGlobePoints: (points) => set({ globePoints: points }),
      setGlobeArcs: (arcs) => set({ globeArcs: arcs }),
      setFireHotspots: (hotspots) => set({ fireHotspots: hotspots }),
      setFloodPredictions: (preds) => set({ floodPredictions: preds }),
      startScan: () => set({ isScanning: true }),
      stopScan: () => set({ isScanning: false }),
      toggleRotation: () => set((s) => ({ isRotating: !s.isRotating })),
      toggleLayer: (key) => set((s) => ({ [key]: !s[key] })),
    }),
    { name: 'earth-store' }
  )
)
