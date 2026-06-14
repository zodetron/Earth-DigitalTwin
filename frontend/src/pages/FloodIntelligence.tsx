import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell,
  PieChart, Pie,
} from 'recharts'
import { apiClient } from '@/services/api'
import { riskColor, riskBgClass, scoreToPercent, formatNumber } from '@/lib/utils'
import type { RiskLevel } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FloodCity {
  city_id: string
  city_name: string
  country: string
  country_code: string
  latitude: number
  longitude: number
  population: number
  flood_probability: number
  risk_level: RiskLevel
  confidence: number
  top_factors: { factor: string; impact: number }[]
  earthmind_risk_index: number
}

interface RiskDist {
  risk_level: RiskLevel
  count: string
  avg_probability: string
}

interface CountryStat {
  country: string
  avg_flood_risk: string
  max_flood_risk: string
  city_count: string
  high_risk_cities: string
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useTopFloodCities(limit = 50) {
  return useQuery({
    queryKey: ['flood', 'top', limit],
    queryFn: () => apiClient.get<{ data: FloodCity[] }>(`/flood/top-risk?limit=${limit}`).then(r => r.data.data),
  })
}

function useFloodDistribution() {
  return useQuery({
    queryKey: ['flood', 'distribution'],
    queryFn: () => apiClient.get<{ data: RiskDist[] }>('/flood/distribution').then(r => r.data.data),
  })
}

function useCountryStats() {
  return useQuery({
    queryKey: ['flood', 'country-stats'],
    queryFn: () => apiClient.get<{ data: CountryStat[] }>('/flood/country-stats').then(r => r.data.data),
  })
}

// ─── Components ──────────────────────────────────────────────────────────────

function SHAPExplainer({ factors }: { factors: { factor: string; impact: number }[] }) {
  const data = factors.map(f => ({
    name: f.factor.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    impact: parseFloat(Math.abs(f.impact * 100).toFixed(2)),
    positive: f.impact > 0,
  })).sort((a, b) => b.impact - a.impact)

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <XAxis type="number" tick={{ fill: '#888', fontSize: 10 }} tickFormatter={v => `${v}%`} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 10 }} width={140} />
        <Tooltip
          contentStyle={{ background: '#0a1628', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8 }}
          formatter={(v: number) => [`${v}%`, 'SHAP Impact']}
        />
        <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.positive ? '#ff6600' : '#00d4ff'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function RiskPie({ data }: { data: RiskDist[] }) {
  const COLORS: Record<string, string> = {
    CRITICAL: '#ff0033', HIGH: '#ff6600', MODERATE: '#ffcc00', LOW: '#00ff88',
  }
  const formatted = data.map(d => ({
    name: d.risk_level,
    value: parseInt(d.count),
    color: COLORS[d.risk_level] || '#888',
  }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={formatted} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
          dataKey="value" paddingAngle={2}>
          {formatted.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#0a1628', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8 }}
          formatter={(v: number) => [formatNumber(v, 0), 'Cities']}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FloodIntelligence() {
  const navigate = useNavigate()
  const [selectedCity, setSelectedCity] = useState<FloodCity | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const { data: cities, isLoading: citiesLoading } = useTopFloodCities(100)
  const { data: distribution } = useFloodDistribution()
  const { data: countryStats } = useCountryStats()

  const filtered = (cities ?? []).filter(c =>
    !searchTerm ||
    c.city_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.country.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-space-dark text-white grid-bg overflow-auto">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/command')}
              className="text-cyan-400/60 hover:text-cyan-400 transition-colors font-mono text-sm">
              ← COMMAND CENTER
            </button>
            <div className="w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌊</span>
              <div>
                <h1 className="font-display text-xl font-bold text-cyan-400 tracking-wider">
                  FLOOD INTELLIGENCE
                </h1>
                <p className="text-white/40 font-mono text-xs">XGBoost · SHAP · R²=0.81</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-xs text-cyan-400/70">7,342 CITIES MONITORED</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Top Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'CITIES ANALYZED', value: '7,342', icon: '🏙️', color: 'text-cyan-400' },
            { label: 'HIGH RISK', value: distribution?.find(d => d.risk_level === 'HIGH')?.count ?? '—', icon: '⚠️', color: 'text-orange-400' },
            { label: 'MODEL ACCURACY', value: 'R²=0.81', icon: '🧠', color: 'text-purple-400' },
            { label: 'AVG FLOOD RISK', value: distribution ? scoreToPercent(
              distribution.reduce((acc, d) => acc + parseFloat(d.avg_probability) * parseInt(d.count), 0) /
              distribution.reduce((acc, d) => acc + parseInt(d.count), 0)
            ) : '—', icon: '📊', color: 'text-yellow-400' },
          ].map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-4 flex items-center gap-3"
            >
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div className={`font-display text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="font-mono text-xs text-white/40 tracking-wider">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: City Table */}
          <div className="lg:col-span-2 glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-cyan-400 tracking-wider">
                TOP FLOOD RISK CITIES
              </h2>
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search city or country..."
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm
                           text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 w-48"
              />
            </div>

            {citiesLoading ? (
              <div className="flex items-center justify-center h-48 text-white/30 font-mono text-sm">
                LOADING PREDICTIONS...
              </div>
            ) : (
              <div className="overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-space-dark/90 backdrop-blur-sm">
                    <tr className="text-left text-white/40 font-mono text-xs tracking-wider border-b border-white/5">
                      <th className="pb-2 pr-4">#</th>
                      <th className="pb-2 pr-4">CITY</th>
                      <th className="pb-2 pr-4">COUNTRY</th>
                      <th className="pb-2 pr-4">POPULATION</th>
                      <th className="pb-2 pr-4">FLOOD PROB</th>
                      <th className="pb-2">RISK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((city, i) => (
                      <motion.tr
                        key={city.city_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.01 }}
                        onClick={() => setSelectedCity(city)}
                        className={`border-b border-white/5 cursor-pointer transition-colors
                          hover:bg-white/5 ${selectedCity?.city_id === city.city_id ? 'bg-cyan-500/10' : ''}`}
                      >
                        <td className="py-2.5 pr-4 text-white/30 font-mono text-xs">{i + 1}</td>
                        <td className="py-2.5 pr-4 font-medium text-white">{city.city_name}</td>
                        <td className="py-2.5 pr-4 text-white/60 text-xs">{city.country}</td>
                        <td className="py-2.5 pr-4 text-white/50 text-xs font-mono">
                          {formatNumber(city.population)}
                        </td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${city.flood_probability * 100}%`,
                                  background: riskColor(city.risk_level),
                                }}
                              />
                            </div>
                            <span className="font-mono text-xs text-white/70">
                              {scoreToPercent(city.flood_probability)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono border ${riskBgClass(city.risk_level)}`}>
                            {city.risk_level}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right: Analytics */}
          <div className="space-y-4">
            {/* Risk Distribution Pie */}
            <div className="glass-panel p-4">
              <h2 className="font-display text-xs font-bold text-cyan-400 tracking-wider mb-3">
                RISK DISTRIBUTION
              </h2>
              {distribution ? (
                <>
                  <RiskPie data={distribution} />
                  <div className="space-y-1.5 mt-2">
                    {distribution.map(d => (
                      <div key={d.risk_level} className="flex items-center justify-between text-xs font-mono">
                        <span className={`flex items-center gap-2 ${
                          d.risk_level === 'CRITICAL' ? 'text-red-400' :
                          d.risk_level === 'HIGH' ? 'text-orange-400' :
                          d.risk_level === 'MODERATE' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          <span className="w-2 h-2 rounded-full inline-block" style={{ background: riskColor(d.risk_level) }} />
                          {d.risk_level}
                        </span>
                        <span className="text-white/50">{formatNumber(parseInt(d.count), 0)} cities</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div className="h-48 flex items-center justify-center text-white/20 text-xs">Loading...</div>}
            </div>

            {/* Country Rankings */}
            <div className="glass-panel p-4">
              <h2 className="font-display text-xs font-bold text-cyan-400 tracking-wider mb-3">
                HIGHEST RISK NATIONS
              </h2>
              <div className="space-y-2">
                {(countryStats ?? []).slice(0, 8).map((s, i) => (
                  <div key={s.country} className="flex items-center gap-2">
                    <span className="text-white/30 font-mono text-xs w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-white text-xs">{s.country}</span>
                        <span className="text-orange-400 font-mono text-xs">
                          {scoreToPercent(parseFloat(s.avg_flood_risk))}
                        </span>
                      </div>
                      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                          style={{ width: `${parseFloat(s.avg_flood_risk) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SHAP City Detail Panel */}
        <AnimatePresence>
          {selectedCity && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="glass-panel p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-lg font-bold text-white">
                      {selectedCity.city_name}
                    </h2>
                    <span className={`px-3 py-1 rounded-lg text-sm font-mono border font-bold ${riskBgClass(selectedCity.risk_level)}`}>
                      {selectedCity.risk_level}
                    </span>
                  </div>
                  <p className="text-white/50 text-sm mt-0.5">
                    {selectedCity.country} · Pop. {formatNumber(selectedCity.population)} ·
                    Lat {parseFloat(selectedCity.latitude as unknown as string).toFixed(3)},
                    Lng {parseFloat(selectedCity.longitude as unknown as string).toFixed(3)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-display text-3xl font-black"
                    style={{ color: riskColor(selectedCity.risk_level) }}>
                    {scoreToPercent(selectedCity.flood_probability)}
                  </div>
                  <div className="text-white/40 font-mono text-xs">FLOOD PROBABILITY</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-mono text-xs text-cyan-400/70 tracking-wider mb-3">
                    SHAP FACTOR ANALYSIS — KEY DRIVERS
                  </h3>
                  {selectedCity.top_factors && (
                    <SHAPExplainer factors={selectedCity.top_factors} />
                  )}
                  <p className="text-white/30 text-xs mt-2 font-mono">
                    🟠 orange = increases flood risk · 🔵 blue = reduces flood risk
                  </p>
                </div>
                <div className="space-y-3">
                  <h3 className="font-mono text-xs text-cyan-400/70 tracking-wider">
                    RISK METRICS
                  </h3>
                  {[
                    { label: 'Flood Probability', value: scoreToPercent(selectedCity.flood_probability), color: riskColor(selectedCity.risk_level) },
                    { label: 'Model Confidence', value: scoreToPercent(selectedCity.confidence ?? 0.85), color: '#00d4ff' },
                    { label: 'EarthMind Risk Index', value: scoreToPercent(selectedCity.earthmind_risk_index), color: '#aa66ff' },
                  ].map(m => (
                    <div key={m.label} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/60 text-sm">{m.label}</span>
                      <span className="font-mono font-bold text-sm" style={{ color: m.color }}>{m.value}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/earthgpt')}
                    className="w-full mt-2 py-2.5 bg-cyan-500/20 border border-cyan-500/40 rounded-lg
                               text-cyan-400 font-mono text-sm hover:bg-cyan-500/30 transition-colors"
                  >
                    ASK EARTHGPT ABOUT {selectedCity.city_name.toUpperCase()} →
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
