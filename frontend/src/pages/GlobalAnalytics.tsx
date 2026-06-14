import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from 'recharts'
import { earthApi } from '@/services/earthApi'
import { fireApi } from '@/services/fireApi'
import { simulationApi } from '@/services/simulationApi'
import { cn, riskBgClass, riskToLevel, formatNumber, formatUSD } from '@/lib/utils'
import type { RiskLevel } from '@/types'

// Pull flood endpoints directly via apiClient
import { apiClient } from '@/services/api'
import type { ApiResponse } from '@/types'

const floodApi = {
  getTopRisk: (limit = 10) =>
    apiClient.get<ApiResponse<Record<string, string | number>[]>>('/flood/top-risk', { params: { limit } }).then(r => r.data.data),
  getCountryStats: () =>
    apiClient.get<ApiResponse<Record<string, string | number>[]>>('/flood/country-stats').then(r => r.data.data),
  getDistribution: () =>
    apiClient.get<ApiResponse<Record<string, string | number>[]>>('/flood/distribution').then(r => r.data.data),
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MODERATE: '#eab308', LOW: '#22c55e',
}

const AGENTS = [
  { name: 'Flood Intelligence', icon: '🌊', route: '/flood', color: '#3b82f6', model: 'XGBoost R²=0.81' },
  { name: 'Wildfire Intelligence', icon: '🔥', route: '/fire', color: '#f97316', model: 'VIIRS DBSCAN' },
  { name: 'Climate Agent', icon: '🌡️', route: '/climate', color: '#22c55e', model: 'Stress Index' },
  { name: 'Simulation Engine', icon: '⚡', route: '/simulation', color: '#eab308', model: 'Future Scenarios' },
  { name: 'Emergency Commander', icon: '🚨', route: '/earthgpt', color: '#ef4444', model: 'claude-sonnet-4-6' },
  { name: 'Economic Impact', icon: '💸', route: '/earthgpt', color: '#a855f7', model: 'EMX Formula' },
  { name: 'EarthGPT Copilot', icon: '🤖', route: '/earthgpt', color: '#fbbf24', model: 'claude-sonnet-4-6' },
]

const DB_STATS = [
  { label: 'Cities Monitored', value: '7,342', icon: '📍' },
  { label: 'Fire Detections', value: '192,000', icon: '🔥' },
  { label: 'Flood Predictions', value: '7,342', icon: '🌊' },
  { label: 'Countries Covered', value: '195', icon: '🌍' },
]

// ─── Small helpers ────────────────────────────────────────────────────────────

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('glass-panel border border-white/10 p-5 flex flex-col gap-3', className)}>
      <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest flex-shrink-0">{title}</p>
      {children}
    </div>
  )
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn('px-2 py-0.5 rounded border font-mono text-[10px] uppercase', riskBgClass(level))}>
      {level}
    </span>
  )
}

// ─── Earth Health Ring ────────────────────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'
  const r = 52, circ = 2 * Math.PI * r
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <motion.circle
          cx="60" cy="60" r={r} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${(score / 100) * circ} ${circ}` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold" style={{ color }}>{score.toFixed(1)}</span>
        <span className="font-mono text-xs text-white/30">/ 100</span>
      </div>
    </div>
  )
}

// ─── Live Ticker ──────────────────────────────────────────────────────────────

function LiveTicker() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="font-mono text-[10px] text-white/30">
      {now.toUTCString().replace('GMT', 'UTC')}
    </span>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function GlobalAnalytics() {
  const { data: health } = useQuery({ queryKey: ['earth', 'health'], queryFn: earthApi.getHealth, refetchInterval: 30_000 })
  const { data: topRisk = [] } = useQuery({ queryKey: ['flood', 'top-risk'], queryFn: () => floodApi.getTopRisk(10), staleTime: 60_000 })
  const { data: floodCountry = [] } = useQuery({ queryKey: ['flood', 'country-stats'], queryFn: floodApi.getCountryStats, staleTime: 60_000 })
  const { data: floodDist = [] } = useQuery({ queryKey: ['flood', 'distribution'], queryFn: floodApi.getDistribution, staleTime: 60_000 })
  const { data: fireSummary } = useQuery({ queryKey: ['fire', 'summary'], queryFn: fireApi.getSummary, staleTime: 60_000 })
  const { data: fireCountry = [] } = useQuery({ queryKey: ['fire', 'country-stats'], queryFn: fireApi.getCountryStats, staleTime: 60_000 })
  const { data: fireSeverity = [] } = useQuery({ queryKey: ['fire', 'severity-distribution'], queryFn: fireApi.getSeverityDistribution, staleTime: 60_000 })
  const { data: simHistory = [] } = useQuery({ queryKey: ['simulation', 'history'], queryFn: simulationApi.getHistory, staleTime: 30_000 })

  const healthScore = health?.score ?? 59.8

  // Charts data
  const floodCountryChart = floodCountry.slice(0, 10).map(c => ({
    name: String(c.country ?? '').split(' ')[0].slice(0, 10),
    risk: Math.round(Number(c.avg_flood_risk ?? 0) * 100),
    cities: Number(c.city_count ?? 0),
  }))

  const fireCountryChart = fireCountry.slice(0, 10).map(c => ({
    name: String(c.country_name ?? '').split(' ')[0].slice(0, 10),
    hotspots: Number(c.hotspot_count ?? 0),
    severity: Math.round(Number(c.avg_severity ?? 0) * 100),
  }))

  const floodDistChart = floodDist.map(d => ({
    name: String(d.risk_level ?? d.level ?? ''),
    value: Number(d.count ?? d.city_count ?? 0),
    color: RISK_COLORS[String(d.risk_level ?? d.level ?? '')] ?? '#666',
  }))

  const fireDistChart = fireSeverity.map(s => ({
    name: String(s.severity_level ?? ''),
    value: Number(s.count ?? 0),
    color: RISK_COLORS[String(s.severity_level ?? '')] ?? '#666',
  }))

  const radialData = [
    { name: 'Flood', value: Math.round(Number(floodCountry[0]?.avg_flood_risk ?? 0.5) * 100), fill: '#3b82f6' },
    { name: 'Fire', value: Math.round(Number(fireSummary?.avg_severity ?? '0.73') * 100), fill: '#f97316' },
    { name: 'Climate', value: 58, fill: '#22c55e' },
    { name: 'Overall', value: Math.round(100 - healthScore), fill: '#ef4444' },
  ]

  return (
    <div className="min-h-screen bg-space-dark text-white">
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-black/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-green-400"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="font-display text-sm text-white/90 tracking-wider">EARTHMIND X</span>
            </div>
            <span className="font-mono text-[10px] border border-white/10 px-2 py-0.5 rounded text-white/40">
              MISSION CONTROL
            </span>
            <LiveTicker />
          </div>

          {/* Live metric strip */}
          <div className="hidden md:flex items-center gap-6">
            {[
              { label: 'Earth Health', val: `${healthScore.toFixed(1)}/100`, color: healthScore >= 60 ? 'text-green-400' : 'text-red-400' },
              { label: 'Cities', val: '7,342', color: 'text-white/70' },
              { label: 'Fire Hotspots', val: Number(fireSummary?.total_hotspots ?? 0).toLocaleString(), color: 'text-orange-400' },
              { label: 'Critical Zones', val: Number(fireSummary?.critical_hotspots ?? 0).toLocaleString(), color: 'text-red-400' },
            ].map(m => (
              <div key={m.label} className="text-center">
                <p className="font-mono text-[9px] text-white/30 uppercase">{m.label}</p>
                <p className={cn('font-display text-sm font-bold', m.color)}>{m.val}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/command" className="font-mono text-xs text-white/40 hover:text-white/80 border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
              🌍 Globe
            </Link>
            <Link to="/earthgpt" className="font-mono text-xs text-yellow-400/70 hover:text-yellow-400 border border-yellow-500/20 px-3 py-1.5 rounded-lg transition-colors">
              🤖 EarthGPT
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 flex flex-col gap-6">
        {/* ── Agent Status Grid ──────────────────────────── */}
        <div>
          <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-3">
            Active Agents — {AGENTS.length} Systems Online
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {AGENTS.map((agent, i) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={agent.route}
                  className="glass-panel border border-white/10 p-3 flex flex-col gap-2 hover:border-white/20 transition-all group block"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{agent.icon}</span>
                    <div className="flex items-center gap-1">
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: agent.color }}
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      />
                      <span className="font-mono text-[9px]" style={{ color: agent.color }}>ONLINE</span>
                    </div>
                  </div>
                  <p className="font-mono text-[10px] text-white/70 leading-tight group-hover:text-white transition-colors">
                    {agent.name}
                  </p>
                  <p className="font-mono text-[9px] text-white/25">{agent.model}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Row 2: Earth Health + Top Risk + DB Stats ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Earth Health */}
          <Panel title="Earth Health Score">
            <HealthRing score={healthScore} />
            <div className="space-y-2 mt-2">
              {[
                { label: 'Cities Monitored', val: health?.totalCitiesMonitored?.toLocaleString() ?? '7,342' },
                { label: 'Critical Zones', val: health?.criticalZones?.toString() ?? '0', warn: true },
                { label: 'High Risk Zones', val: health?.highRiskZones?.toString() ?? '—', warn: true },
                { label: 'Avg Global Risk', val: health ? `${(health.avgGlobalRisk * 100).toFixed(1)}%` : '—' },
              ].map(m => (
                <div key={m.label} className="flex justify-between items-center">
                  <span className="font-mono text-[10px] text-white/30">{m.label}</span>
                  <span className={cn('font-mono text-[10px]', m.warn ? 'text-orange-400' : 'text-white/70')}>{m.val}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Link to="/command" className="flex-1 text-center font-mono text-[10px] py-1.5 rounded border border-white/10 text-white/30 hover:text-white/60 transition-colors">
                View Globe
              </Link>
              <Link to="/simulation" className="flex-1 text-center font-mono text-[10px] py-1.5 rounded border border-yellow-500/20 text-yellow-400/70 hover:bg-yellow-500/10 transition-colors">
                Simulate
              </Link>
            </div>
          </Panel>

          {/* Top 10 flood-risk cities */}
          <Panel title="Top Flood Risk Cities" className="lg:col-span-2">
            <div className="overflow-x-auto flex-1">
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    {['#', 'City', 'Country', 'Flood Risk', 'EMX Risk', 'Level'].map(h => (
                      <th key={h} className="text-left py-1.5 px-2 text-[10px] text-white/30 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topRisk.map((city, i) => {
                    const prob = Number(city.flood_probability ?? 0)
                    const emx = Number(city.earthmind_risk_index ?? 0)
                    const level = riskToLevel(prob)
                    return (
                      <motion.tr
                        key={String(city.city_id ?? i)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-2 px-2 text-white/30">{i + 1}</td>
                        <td className="py-2 px-2 text-white font-semibold">{String(city.city_name ?? '')}</td>
                        <td className="py-2 px-2 text-white/50">{String(city.country ?? '')}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${prob * 100}%` }} />
                            </div>
                            <span className="text-blue-300">{(prob * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-white/60">{(emx * 100).toFixed(1)}%</td>
                        <td className="py-2 px-2"><RiskBadge level={level} /></td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Link to="/flood" className="font-mono text-[10px] text-blue-400/60 hover:text-blue-400 transition-colors mt-1 text-center">
              Full Flood Intelligence →
            </Link>
          </Panel>
        </div>

        {/* ── Row 3: Flood country + Fire country bar charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Flood Risk by Country — Top 10">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={floodCountryChart} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'monospace' }} angle={-25} textAnchor="end" interval={0} height={40} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'monospace' }} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }} formatter={(v: number) => [`${v}%`, 'Avg Flood Risk']} />
                  <Bar dataKey="risk" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Link to="/flood" className="font-mono text-[10px] text-blue-400/60 hover:text-blue-400 text-center transition-colors">
              Flood Intelligence →
            </Link>
          </Panel>

          <Panel title="Wildfire Hotspots by Country — Top 10">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fireCountryChart} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'monospace' }} angle={-25} textAnchor="end" interval={0} height={40} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 9, fontFamily: 'monospace' }} />
                  <Tooltip contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }} formatter={(v: number) => [v.toLocaleString(), 'Hotspots']} />
                  <Bar dataKey="hotspots" fill="#f97316" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Link to="/fire" className="font-mono text-[10px] text-orange-400/60 hover:text-orange-400 text-center transition-colors">
              Fire Intelligence →
            </Link>
          </Panel>
        </div>

        {/* ── Row 4: Distribution pies + Radial + Sim history ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Flood distribution pie */}
          <Panel title="Flood Risk Distribution">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={floodDistChart} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {floodDistChart.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }} formatter={(v: number) => [v.toLocaleString()]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Fire severity pie */}
          <Panel title="Fire Severity Distribution">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={fireDistChart} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}
                    label={({ name, percent }) => `${name.slice(0,4)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {fireDistChart.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }} formatter={(v: number) => [v.toLocaleString()]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Radial risk overview */}
          <Panel title="Global Risk Overview">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius={15} outerRadius={75} data={radialData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Tooltip contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }} formatter={(v: number) => [`${v}%`]} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {radialData.map(d => (
                <span key={d.name} className="font-mono text-[9px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.fill }} />
                  {d.name} {d.value}%
                </span>
              ))}
            </div>
          </Panel>

          {/* Simulation history */}
          <Panel title="Recent Simulations">
            {simHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                <span className="text-4xl opacity-20">⚡</span>
                <p className="font-mono text-[10px] text-white/20">No simulations yet</p>
                <Link to="/simulation" className="font-mono text-[10px] text-yellow-400/60 border border-yellow-500/20 px-3 py-1.5 rounded hover:bg-yellow-500/10 transition-colors">
                  Run Simulation →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2 flex-1">
                {simHistory.slice(0, 5).map((s, i) => {
                  const delta = Number(s.earth_health_delta ?? 0)
                  return (
                    <div key={String(s.session_id ?? i)} className="flex items-center gap-2 py-1.5 border-b border-white/5">
                      <span className="font-mono text-[9px] text-white/30 border border-white/10 px-1.5 py-0.5 rounded">
                        {String(s.mode ?? '—')}
                      </span>
                      <span className="font-mono text-[10px] text-blue-300">F {Math.round(Number(s.flood_risk_sim ?? 0) * 100)}%</span>
                      <span className="font-mono text-[10px] text-orange-300">🔥 {Math.round(Number(s.fire_risk_sim ?? 0) * 100)}%</span>
                      <span className={cn('ml-auto font-display text-sm font-bold', delta < 0 ? 'text-red-400' : 'text-green-400')}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </span>
                    </div>
                  )
                })}
                <Link to="/simulation" className="font-mono text-[10px] text-yellow-400/60 hover:text-yellow-400 text-center transition-colors mt-auto">
                  Simulation Lab →
                </Link>
              </div>
            )}
          </Panel>
        </div>

        {/* ── Row 5: DB stats + Fire global summary ─────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {DB_STATS.map(s => (
            <div key={s.label} className="glass-panel border border-white/10 p-4 col-span-2">
              <p className="font-mono text-[10px] text-white/30 uppercase">{s.icon} {s.label}</p>
              <p className="font-display text-2xl font-bold text-white mt-1">{s.value}</p>
            </div>
          ))}
          {[
            { label: 'Avg FRP', value: `${fireSummary?.avg_frp ?? '—'} MW`, color: 'text-orange-400', icon: '⚡' },
            { label: 'Peak FRP', value: `${Number(fireSummary?.max_frp ?? 0).toLocaleString()} MW`, color: 'text-red-400', icon: '🔥' },
            { label: 'Fire Clusters', value: fireSummary?.active_clusters ?? '—', color: 'text-yellow-400', icon: '🗂️' },
            { label: 'Countries Burning', value: fireSummary?.countries_affected ?? '—', color: 'text-orange-300', icon: '🌍' },
          ].map(s => (
            <div key={s.label} className="glass-panel border border-white/10 p-4 col-span-2">
              <p className="font-mono text-[10px] text-white/30 uppercase">{s.icon} {s.label}</p>
              <p className={cn('font-display text-2xl font-bold mt-1', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-4 text-white/20 font-mono text-[10px]">
          <span>EarthMind X · Mission Control · v2.0 · XGBoost R²=0.81 · VIIRS 2024 · claude-sonnet-4-6</span>
          <div className="flex gap-4">
            {['/flood', '/fire', '/simulation', '/earthgpt', '/command'].map(r => (
              <Link key={r} to={r} className="hover:text-white/60 transition-colors uppercase">
                {r.replace('/', '')}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
