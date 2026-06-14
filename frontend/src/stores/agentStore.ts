import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { AgentName, AgentStatus, EarthGPTMessage } from '@/types'

interface AgentStore {
  agents: Record<AgentName, { status: AgentStatus; lastRun?: string; error?: string }>
  earthGPTMessages: EarthGPTMessage[]
  earthGPTLoading: boolean
  lastScanAt: string | null

  setAgentStatus: (name: AgentName, status: AgentStatus, error?: string) => void
  addEarthGPTMessage: (msg: EarthGPTMessage) => void
  setEarthGPTLoading: (loading: boolean) => void
  clearEarthGPT: () => void
  setLastScanAt: (ts: string) => void
}

const defaultAgents: Record<AgentName, { status: AgentStatus }> = {
  FloodIntelligence: { status: 'idle' },
  WildfireIntelligence: { status: 'idle' },
  Climate: { status: 'idle' },
  Simulation: { status: 'idle' },
  EmergencyCommander: { status: 'idle' },
  EconomicImpact: { status: 'idle' },
  EarthGPT: { status: 'idle' },
}

export const useAgentStore = create<AgentStore>()(
  devtools(
    (set) => ({
      agents: defaultAgents,
      earthGPTMessages: [],
      earthGPTLoading: false,
      lastScanAt: null,

      setAgentStatus: (name, status, error) =>
        set((s) => ({
          agents: {
            ...s.agents,
            [name]: { ...s.agents[name], status, error, lastRun: new Date().toISOString() },
          },
        })),

      addEarthGPTMessage: (msg) =>
        set((s) => ({ earthGPTMessages: [...s.earthGPTMessages, msg] })),

      setEarthGPTLoading: (loading) => set({ earthGPTLoading: loading }),
      clearEarthGPT: () => set({ earthGPTMessages: [] }),
      setLastScanAt: (ts) => set({ lastScanAt: ts }),
    }),
    { name: 'agent-store' }
  )
)
