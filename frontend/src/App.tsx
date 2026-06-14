import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from '@/pages/Landing'
import CommandCenter from '@/pages/CommandCenter'
import GlobalAnalytics from '@/pages/GlobalAnalytics'
import FloodIntelligence from '@/pages/FloodIntelligence'
import FireIntelligence from '@/pages/FireIntelligence'
import ClimateIntelligence from '@/pages/ClimateIntelligence'
import SimulationLab from '@/pages/SimulationLab'
import EarthGPTPage from '@/pages/EarthGPTPage'
import PredictionHistory from '@/pages/PredictionHistory'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/command" element={<CommandCenter />} />
        <Route path="/analytics" element={<GlobalAnalytics />} />
        <Route path="/flood" element={<FloodIntelligence />} />
        <Route path="/fire" element={<FireIntelligence />} />
        <Route path="/climate" element={<ClimateIntelligence />} />
        <Route path="/simulation" element={<SimulationLab />} />
        <Route path="/earthgpt" element={<EarthGPTPage />} />
        <Route path="/history" element={<PredictionHistory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
