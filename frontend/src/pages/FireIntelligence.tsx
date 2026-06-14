import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import { Link } from 'react-router-dom'
import { fireApi } from '@/services/fireApi'
import type { FireCountryStat, FireCluster, RiskLevel } from '@/types'
import { cn } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#eab308',
  LOW: '#22c55e',
}

const SEVERITY_BG: Record<string, string> = {
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  LOW: 'bg-green-500/20 text-green-400 border-green-500/40',
}

const COUNTRY_BAR_COLOR = '#f97316'

function severityLevel(score: number): RiskLevel {
  if (score >= 0.75) return 'CRITICAL'
  if (score >= 0.50) return 'HIGH'
  if (score >= 0.25) return 'MODERATE'
  return 'LOW'
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-4 flex flex-col gap-1 border border-white/10"
    >
      <p className="font-mono text-xs text-white/40 uppercase tracking-widest">{label}</p>
      <p className={cn('font-display text-2xl font-bold', accent ?? 'text-white')}>{value}</p>
      {sub && <p className="font-mono text-xs text-white/30">{sub}</p>}
    </motion.div>
  )
}

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={cn('px-2 py-0.5 rounded border font-mono text-[10px] uppercase', SEVERITY_BG[level])}>
      {level}
    </span>
  )
}

function SeverityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color =
    pct >= 75 ? 'bg-red-500' : pct >= 50 ? 'bg-orange-500' : pct >= 25 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-white/60">{pct}%</span>
    </div>
  )
}

// ─── Panels ──────────────────────────────────────────────────────────────────

function CountryDetailPanel({
  country,
  onClose,
}: {
  country: FireCountryStat
  onClose: () => void
}) {
  const dayPct = country.hotspot_count > 0
    ? Math.round((country.day_detections / country.hotspot_count) * 100)
    : 50
  const nightPct = 100 - dayPct

  const dnData = [
    { name: 'Daytime', value: dayPct, color: '#fbbf24' },
    { name: 'Nighttime', value: nightPct, color: '#6366f1' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      className="glass-panel border border-white/10 p-5 flex flex-col gap-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-lg text-white">{country.country_name}</h3>
          <p className="font-mono text-xs text-white/40 mt-0.5">Wildfire Intelligence Profile</p>
        </div>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/80 transition-colors text-lg font-mono"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Hotspots', value: country.hotspot_count.toLocaleString() },
          { label: 'Fire Clusters', value: country.cluster_count.toLocaleString() },
          { label: 'Avg FRP (MW)', value: country.avg_frp.toFixed(1) },
          { label: 'Peak FRP (MW)', value: country.max_frp.toFixed(1) },
          { label: 'Critical Spots', value: country.critical_hotspots.toLocaleString(), accent: 'text-red-400' },
          {
            label: 'Avg Severity',
            value: (country.avg_severity * 100).toFixed(1) + '%',
            accent:
              country.avg_severity >= 0.75
                ? 'text-red-400'
                : country.avg_severity >= 0.5
                  ? 'text-orange-400'
                  : 'text-yellow-400',
          },
        ].map((m) => (
          <div key={m.label} className="bg-white/5 rounded-lg p-3">
            <p className="font-mono text-[10px] text-white/40 uppercase">{m.label}</p>
            <p className={cn('font-display text-xl font-bold mt-0.5', m.accent ?? 'text-white')}>{m.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="font-mono text-xs text-white/40 uppercase mb-2">Day vs Night Detections</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dnData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                {dnData.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Legend
                iconSize={8}
                formatter={(v) => <span className="font-mono text-xs text-white/60">{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <RiskBadge level={severityLevel(country.avg_severity)} />
        <SeverityBar score={country.avg_severity} />
      </div>

      <Link
        to="/earthgpt"
        state={{ context: `Wildfire situation in ${country.country_name}` }}
        className="mt-auto flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 font-mono text-xs py-2 rounded-lg transition-colors"
      >
        Ask EarthGPT about {country.country_name} fires →
      </Link>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FireIntelligence() {
  const [selectedCountry, setSelectedCountry] = useState<FireCountryStat | null>(null)
  const [clusterLimit, setClusterLimit] = useState(20)
  const [countrySearch, setCountrySearch] = useState('')
  const [sortField, setSortField] = useState<keyof FireCountryStat>('hotspot_count')

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['fire', 'summary'],
    queryFn: fireApi.getSummary,
    staleTime: 60_000,
  })

  const { data: countryStats = [], isLoading: loadingCountry } = useQuery({
    queryKey: ['fire', 'country-stats'],
    queryFn: fireApi.getCountryStats,
    staleTime: 60_000,
  })

  const { data: clusters = [], isLoading: loadingClusters } = useQuery({
    queryKey: ['fire', 'clusters', clusterLimit],
    queryFn: () => fireApi.getClusters(clusterLimit),
    staleTime: 60_000,
  })

  const { data: severityDist = [] } = useQuery({
    queryKey: ['fire', 'severity-distribution'],
    queryFn: fireApi.getSeverityDistribution,
    staleTime: 60_000,
  })

  const { data: frpDist = [] } = useQuery({
    queryKey: ['fire', 'frp-distribution'],
    queryFn: fireApi.getFrpDistribution,
    staleTime: 60_000,
  })

  const filteredCountries = countryStats
    .filter((c) => c.country_name.toLowerCase().includes(countrySearch.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortField]
      const bv = b[sortField]
      return typeof av === 'number' && typeof bv === 'number' ? bv - av : 0
    })

  const topChartData = countryStats.slice(0, 12).map((c) => ({
    name: c.country_name.length > 12 ? c.country_name.slice(0, 11) + '…' : c.country_name,
    hotspots: c.hotspot_count,
    avg_frp: c.avg_frp,
  }))

  const isLoading = loadingSummary || loadingCountry || loadingClusters

  return (
    <div className="min-h-screen bg-space-dark text-white">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <h1 className="font-display text-2xl gradient-text">WILDFIRE INTELLIGENCE</h1>
              <span className="px-2 py-0.5 border border-orange-500/40 bg-orange-500/10 text-orange-400 font-mono text-[10px] uppercase rounded">
                VIIRS DBSCAN
              </span>
            </div>
            <p className="font-mono text-xs text-white/40 mt-1">
              Real-time fire hotspot clustering · 2024 NASA VIIRS-SNPP satellite data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="font-mono text-xs text-white/60">VIIRS LIVE</span>
            </div>
            <Link
              to="/"
              className="font-mono text-xs text-white/40 hover:text-white/80 transition-colors border border-white/10 px-3 py-1.5 rounded-lg"
            >
              ← COMMAND
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 flex flex-col gap-6">
        {/* ── Stat Cards ───────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="col-span-2">
            <StatCard
              label="Total Hotspots"
              value={summary ? Number(summary.total_hotspots).toLocaleString() : '—'}
              sub="2024 detections"
              accent="text-orange-400"
            />
          </div>
          <div className="col-span-2">
            <StatCard
              label="Fire Clusters"
              value={summary?.active_clusters ?? '—'}
              sub="DBSCAN 50 km radius"
              accent="text-yellow-400"
            />
          </div>
          <div className="col-span-2">
            <StatCard
              label="Countries Burning"
              value={summary?.countries_affected ?? '—'}
              sub="satellite coverage"
              accent="text-red-400"
            />
          </div>
          <div className="col-span-2">
            <StatCard
              label="Peak FRP"
              value={summary ? `${Number(summary.max_frp).toLocaleString()} MW` : '—'}
              sub="Fire Radiative Power"
              accent="text-rose-400"
            />
          </div>
          <div className="col-span-2">
            <StatCard
              label="Avg FRP"
              value={summary ? `${summary.avg_frp} MW` : '—'}
              sub="mean intensity"
            />
          </div>
          <div className="col-span-2">
            <StatCard
              label="Critical Zones"
              value={summary ? Number(summary.critical_hotspots).toLocaleString() : '—'}
              sub="severity ≥ 0.75"
              accent="text-red-400"
            />
          </div>
          <div className="col-span-2">
            <StatCard
              label="High + Critical"
              value={summary ? Number(summary.high_or_critical).toLocaleString() : '—'}
              sub="severity ≥ 0.50"
              accent="text-orange-400"
            />
          </div>
          <div className="col-span-2">
            <StatCard
              label="Avg Severity"
              value={summary ? `${(Number(summary.avg_severity) * 100).toFixed(1)}%` : '—'}
              sub="global mean"
            />
          </div>
        </div>

        {/* ── Charts Row ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Country hotspot bar */}
          <div className="lg:col-span-2 glass-panel border border-white/10 p-5">
            <h2 className="font-display text-sm text-white/80 mb-4 uppercase tracking-widest">
              Hotspots by Country — Top 12
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topChartData} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    height={50}
                  />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: 'monospace' }} />
                  <Tooltip
                    contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(v: number) => [v.toLocaleString(), 'Hotspots']}
                  />
                  <Bar dataKey="hotspots" fill={COUNTRY_BAR_COLOR} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Severity distribution pie */}
          <div className="glass-panel border border-white/10 p-5">
            <h2 className="font-display text-sm text-white/80 mb-4 uppercase tracking-widest">
              Severity Distribution
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="count"
                    nameKey="severity_level"
                    paddingAngle={2}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {severityDist.map((e, i) => (
                      <Cell key={i} fill={SEVERITY_COLORS[e.severity_level] ?? '#666'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }}
                    formatter={(v: number, name) => [v.toLocaleString(), String(name)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── FRP Distribution ─────────────────────────────── */}
        <div className="glass-panel border border-white/10 p-5">
          <h2 className="font-display text-sm text-white/80 mb-4 uppercase tracking-widest">
            Fire Radiative Power Distribution (MW) — capped at 500 MW
          </h2>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={frpDist} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="frpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="frp_min"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: 'monospace' }}
                  tickFormatter={(v) => `${v}`}
                  label={{ value: 'FRP (MW)', position: 'insideBottom', offset: -2, fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontFamily: 'monospace' }} />
                <Tooltip
                  contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }}
                  formatter={(v: number) => [v.toLocaleString(), 'Hotspots']}
                  labelFormatter={(v) => `FRP ${v}–${Number(v) + 25} MW`}
                />
                <Area type="monotone" dataKey="count" stroke="#f97316" fill="url(#frpGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Main content: table + detail panel ───────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Country table */}
          <div className="xl:col-span-2 glass-panel border border-white/10 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display text-sm text-white/80 uppercase tracking-widest">
                Country Fire Intelligence ({filteredCountries.length})
              </h2>
              <div className="flex items-center gap-3">
                <input
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search country…"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white placeholder-white/30 outline-none focus:border-orange-500/50 w-40"
                />
                <select
                  value={sortField as string}
                  onChange={(e) => setSortField(e.target.value as keyof FireCountryStat)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 font-mono text-xs text-white outline-none"
                >
                  <option value="hotspot_count">Sort: Hotspots</option>
                  <option value="avg_frp">Sort: Avg FRP</option>
                  <option value="max_frp">Sort: Peak FRP</option>
                  <option value="avg_severity">Sort: Severity</option>
                  <option value="critical_hotspots">Sort: Critical</option>
                </select>
              </div>
            </div>

            {loadingCountry ? (
              <div className="flex-1 flex items-center justify-center">
                <span className="font-mono text-white/40 text-sm animate-pulse">Loading fire data…</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      {['#', 'Country', 'Hotspots', 'Clusters', 'Avg FRP', 'Peak FRP', 'Severity', 'Level'].map((h) => (
                        <th key={h} className="text-left py-2 px-2 text-white/40 uppercase text-[10px] tracking-widest">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCountries.map((c, i) => (
                      <motion.tr
                        key={c.country_name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.01 }}
                        onClick={() => setSelectedCountry(selectedCountry?.country_name === c.country_name ? null : c)}
                        className={cn(
                          'border-b border-white/5 cursor-pointer transition-colors',
                          selectedCountry?.country_name === c.country_name
                            ? 'bg-orange-500/10'
                            : 'hover:bg-white/5',
                        )}
                      >
                        <td className="py-2 px-2 text-white/30">{i + 1}</td>
                        <td className="py-2 px-2 text-white font-semibold">
                          {c.country_name}
                        </td>
                        <td className="py-2 px-2 text-orange-300">{c.hotspot_count.toLocaleString()}</td>
                        <td className="py-2 px-2 text-white/60">{c.cluster_count}</td>
                        <td className="py-2 px-2 text-yellow-300">{c.avg_frp.toFixed(1)}</td>
                        <td className="py-2 px-2 text-red-300">{c.max_frp.toFixed(1)}</td>
                        <td className="py-2 px-2">
                          <SeverityBar score={c.avg_severity} />
                        </td>
                        <td className="py-2 px-2">
                          <RiskBadge level={severityLevel(c.avg_severity)} />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Country detail panel */}
          <AnimatePresence mode="wait">
            {selectedCountry ? (
              <CountryDetailPanel
                key={selectedCountry.country_name}
                country={selectedCountry}
                onClose={() => setSelectedCountry(null)}
              />
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-panel border border-white/10 p-5 flex flex-col items-center justify-center gap-4 text-center"
              >
                <div className="text-6xl opacity-30">🔥</div>
                <p className="font-mono text-xs text-white/30">
                  Click a country row to view wildfire profile
                </p>
                <div className="grid grid-cols-2 gap-2 w-full mt-4">
                  {Object.entries(SEVERITY_COLORS).map(([lvl, color]) => {
                    const row = severityDist.find((s) => s.severity_level === lvl)
                    return (
                      <div key={lvl} className="bg-white/5 rounded-lg p-2 text-left">
                        <span className="block font-mono text-[10px] uppercase" style={{ color }}>
                          {lvl}
                        </span>
                        <span className="font-display text-base text-white">
                          {row ? row.count.toLocaleString() : '0'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Fire Clusters ────────────────────────────────── */}
        <div className="glass-panel border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-display text-sm text-white/80 uppercase tracking-widest">
              Active Fire Clusters — DBSCAN 50 km Radius
            </h2>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-white/40">Show top</span>
              {[20, 50, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setClusterLimit(n)}
                  className={cn(
                    'font-mono text-xs px-2 py-1 rounded border transition-colors',
                    clusterLimit === n
                      ? 'border-orange-500/60 bg-orange-500/10 text-orange-400'
                      : 'border-white/10 text-white/40 hover:text-white/70',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {loadingClusters ? (
            <div className="py-12 text-center font-mono text-white/30 text-sm animate-pulse">
              Clustering hotspots…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Cluster', 'Country', 'Center', 'Hotspots', 'Avg FRP', 'Peak FRP', 'Severity', 'Risk'].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-white/40 uppercase text-[10px] tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clusters.map((cl, i) => (
                    <motion.tr
                      key={`${cl.cluster_id}-${cl.country_name}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.01 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-2 px-3 text-white/50">#{cl.cluster_id}</td>
                      <td className="py-2 px-3 text-white">{cl.country_name}</td>
                      <td className="py-2 px-3 text-white/50">
                        {cl.center_lat.toFixed(2)}, {cl.center_lng.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-orange-300">{cl.hotspot_count.toLocaleString()}</td>
                      <td className="py-2 px-3 text-yellow-300">{cl.avg_frp.toFixed(1)}</td>
                      <td className="py-2 px-3 text-red-300">{cl.max_frp.toFixed(1)}</td>
                      <td className="py-2 px-3">
                        <SeverityBar score={cl.max_severity} />
                      </td>
                      <td className="py-2 px-3">
                        <RiskBadge level={severityLevel(cl.max_severity)} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="border-t border-white/10 pt-4 flex items-center justify-between text-white/20 font-mono text-[10px]">
          <span>EarthMind X · Wildfire Intelligence Agent · VIIRS SNPP 2024 · 192,000 detections</span>
          <Link to="/earthgpt" className="hover:text-orange-400 transition-colors">
            Ask EarthGPT →
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 glass-panel border border-orange-500/30 px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="font-mono text-xs text-orange-400">Loading fire data…</span>
        </div>
      )}
    </div>
  )
}
