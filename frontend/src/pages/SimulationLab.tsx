import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { simulationApi } from '@/services/simulationApi'
import { cn, formatNumber, formatUSD, riskToLevel } from '@/lib/utils'
import type { SimulationParams, SimulationResult, SimulationMode } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const MODES: { id: SimulationMode; label: string; color: string; desc: string }[] = [
  { id: 'CURRENT', label: 'Current', color: 'text-green-400 border-green-500/50', desc: 'Baseline conditions' },
  { id: '2030', label: '2030', color: 'text-yellow-400 border-yellow-500/50', desc: '+1.2°C, +8mm rainfall' },
  { id: '2040', label: '2040', color: 'text-orange-400 border-orange-500/50', desc: '+2.0°C, +15mm rainfall' },
  { id: '2050', label: '2050', color: 'text-red-400 border-red-500/50', desc: '+3.1°C, +22mm rainfall' },
  { id: 'WORST_CASE', label: 'Worst Case', color: 'text-red-300 border-red-400/60', desc: '+5.0°C, catastrophic' },
]

const DEFAULT_PARAMS: SimulationParams = {
  rainfall: 50,
  temperature: 25,
  humidity: 60,
  wind_speed: 20,
  vegetation_dryness: 40,
  population_density: 50,
  mode: 'CURRENT',
}

interface SliderConfig {
  key: keyof SimulationParams
  label: string
  unit: string
  min: number
  max: number
  step: number
  color: string
  icon: string
}

const SLIDERS: SliderConfig[] = [
  { key: 'rainfall', label: 'Rainfall', unit: 'mm', min: 0, max: 200, step: 1, color: '#3b82f6', icon: '🌧️' },
  { key: 'temperature', label: 'Temperature', unit: '°C', min: -20, max: 60, step: 0.5, color: '#ef4444', icon: '🌡️' },
  { key: 'humidity', label: 'Humidity', unit: '%', min: 0, max: 100, step: 1, color: '#06b6d4', icon: '💧' },
  { key: 'wind_speed', label: 'Wind Speed', unit: 'km/h', min: 0, max: 300, step: 1, color: '#8b5cf6', icon: '💨' },
  { key: 'vegetation_dryness', label: 'Veg. Dryness', unit: '%', min: 0, max: 100, step: 1, color: '#f97316', icon: '🌿' },
  { key: 'population_density', label: 'Pop. Density', unit: '/100', min: 0, max: 100, step: 1, color: '#a855f7', icon: '👥' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnimatedNumber({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const motionVal = useMotionValue(0)
  const spring = useSpring(motionVal, { damping: 30, stiffness: 100 })
  const [display, setDisplay] = useState('0')

  spring.on('change', (v) => setDisplay(v.toFixed(decimals)))

  if (motionVal.get() !== value) motionVal.set(value)

  return <span>{display}{suffix}</span>
}

function RiskGauge({ label, value, color, icon }: {
  label: string; value: number; color: string; icon: string
}) {
  const pct = Math.round(value * 100)
  const r = 40
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <motion.circle
            cx="48" cy="48" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${dash} ${circ}` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl">{icon}</span>
          <span className="font-display text-lg font-bold" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <span className="font-mono text-xs text-white/50 uppercase tracking-wider">{label}</span>
      <span className={cn(
        'font-mono text-[10px] px-2 py-0.5 rounded border',
        pct >= 75 ? 'border-red-500/40 text-red-400 bg-red-500/10'
          : pct >= 50 ? 'border-orange-500/40 text-orange-400 bg-orange-500/10'
            : pct >= 25 ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
              : 'border-green-500/40 text-green-400 bg-green-500/10',
      )}>
        {riskToLevel(value)}
      </span>
    </div>
  )
}

function HistoryRow({ sim, onClick }: { sim: SimulationResult; onClick: () => void }) {
  const date = sim.simulated_at ? new Date(sim.simulated_at).toLocaleString() : '—'
  const delta = sim.earth_health_delta ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/10"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] border border-white/20 px-1.5 py-0.5 rounded text-white/60">
            {sim.mode}
          </span>
          <span className="font-mono text-[10px] text-white/30 truncate">{date}</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="font-mono text-xs text-blue-400">
            Flood {Math.round((sim.flood_risk_sim ?? 0) * 100)}%
          </span>
          <span className="font-mono text-xs text-orange-400">
            Fire {Math.round((sim.fire_risk_sim ?? 0) * 100)}%
          </span>
        </div>
      </div>
      <span className={cn('font-display text-sm font-bold', delta < 0 ? 'text-red-400' : 'text-green-400')}>
        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
      </span>
    </motion.div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function SimulationLab() {
  const qc = useQueryClient()
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [comparisonResult, setComparisonResult] = useState<SimulationResult | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [comparisonParams, setComparisonParams] = useState<SimulationParams>({ ...DEFAULT_PARAMS, mode: '2050' })
  const resultRef = useRef<HTMLDivElement>(null)

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['simulation', 'history'],
    queryFn: simulationApi.getHistory,
    staleTime: 10_000,
  })

  const { mutate: runSim, isPending } = useMutation({
    mutationFn: simulationApi.run,
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['simulation', 'history'] })
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    },
  })

  const { mutate: runCompare, isPending: comparePending } = useMutation({
    mutationFn: simulationApi.run,
    onSuccess: (data) => setComparisonResult(data),
  })

  const setParam = (key: keyof SimulationParams, val: number | string) =>
    setParams((p) => ({ ...p, [key]: val }))

  const setCompParam = (key: keyof SimulationParams, val: number | string) =>
    setComparisonParams((p) => ({ ...p, [key]: val }))

  const radarData = result
    ? [
        { subject: 'Flood', A: result.flood_risk_sim * 100, B: comparisonResult?.flood_risk_sim ? comparisonResult.flood_risk_sim * 100 : undefined },
        { subject: 'Fire', A: result.fire_risk_sim * 100, B: comparisonResult?.fire_risk_sim ? comparisonResult.fire_risk_sim * 100 : undefined },
        { subject: 'Climate', A: result.climate_stress_sim * 100, B: comparisonResult?.climate_stress_sim ? comparisonResult.climate_stress_sim * 100 : undefined },
        { subject: 'Economic', A: Math.min((result.economic_loss_usd / 1e10) * 100, 100), B: comparisonResult ? Math.min((comparisonResult.economic_loss_usd / 1e10) * 100, 100) : undefined },
        { subject: 'Population', A: Math.min((result.affected_population / 1e7) * 100, 100), B: comparisonResult ? Math.min((comparisonResult.affected_population / 1e7) * 100, 100) : undefined },
      ]
    : []

  const historyBarData = history.slice(0, 8).map((h, i) => ({
    name: `#${i + 1}`,
    flood: Math.round((h.flood_risk_sim ?? 0) * 100),
    fire: Math.round((h.fire_risk_sim ?? 0) * 100),
    mode: h.mode,
  }))

  return (
    <div className="min-h-screen bg-space-dark text-white">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <h1 className="font-display text-2xl gradient-text">SIMULATION LAB</h1>
              <span className="px-2 py-0.5 border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 font-mono text-[10px] uppercase rounded">
                Future Engine
              </span>
            </div>
            <p className="font-mono text-xs text-white/40 mt-1">
              Parameterize environmental conditions · Predict cascading risks · Explore future scenarios
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCompareMode((v) => !v)}
              className={cn(
                'font-mono text-xs px-3 py-1.5 rounded border transition-colors',
                compareMode
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
                  : 'border-white/10 text-white/40 hover:text-white/70',
              )}
            >
              {compareMode ? '✓ Compare Mode' : 'Compare Mode'}
            </button>
            <Link
              to="/command"
              className="font-mono text-xs text-white/40 hover:text-white/80 transition-colors border border-white/10 px-3 py-1.5 rounded-lg"
            >
              ← COMMAND
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── LEFT: Controls ─────────────────────────── */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            {/* Scenario selector */}
            <div className="glass-panel border border-white/10 p-5">
              <p className="font-mono text-xs text-white/40 uppercase tracking-widest mb-3">
                Future Scenario
              </p>
              <div className="flex flex-col gap-1.5">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setParam('mode', m.id)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-lg border font-mono text-xs transition-all',
                      params.mode === m.id
                        ? m.color + ' bg-white/5'
                        : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/70',
                    )}
                  >
                    <span className="font-semibold">{m.label}</span>
                    <span className="text-[10px] text-white/30">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Parameter sliders */}
            <div className="glass-panel border border-white/10 p-5">
              <p className="font-mono text-xs text-white/40 uppercase tracking-widest mb-4">
                Environmental Parameters
              </p>
              <div className="flex flex-col gap-5">
                {SLIDERS.map((s) => {
                  const val = params[s.key] as number
                  const pct = ((val - s.min) / (s.max - s.min)) * 100
                  return (
                    <div key={s.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs text-white/70 flex items-center gap-1.5">
                          <span>{s.icon}</span> {s.label}
                        </span>
                        <span className="font-display text-sm font-bold" style={{ color: s.color }}>
                          {typeof val === 'number' ? val.toFixed(s.step < 1 ? 1 : 0) : val}
                          <span className="font-mono text-xs text-white/30 ml-0.5">{s.unit}</span>
                        </span>
                      </div>
                      <div className="relative h-5 flex items-center">
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: s.color }}
                          />
                        </div>
                        <input
                          type="range"
                          min={s.min}
                          max={s.max}
                          step={s.step}
                          value={val}
                          onChange={(e) => setParam(s.key, parseFloat(e.target.value))}
                          className="absolute inset-0 w-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="font-mono text-[9px] text-white/20">{s.min}{s.unit}</span>
                        <span className="font-mono text-[9px] text-white/20">{s.max}{s.unit}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Run button */}
            <button
              onClick={() => runSim(params)}
              disabled={isPending}
              className={cn(
                'w-full py-4 rounded-xl border font-display text-lg uppercase tracking-widest transition-all',
                isPending
                  ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400 animate-pulse'
                  : 'border-yellow-400/60 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20 hover:scale-[1.01]',
              )}
            >
              {isPending ? '⟳ Running Simulation…' : '⚡ Run Simulation'}
            </button>

            {/* Comparison panel */}
            {compareMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="glass-panel border border-purple-500/30 p-5 overflow-hidden"
              >
                <p className="font-mono text-xs text-purple-400 uppercase tracking-widest mb-3">
                  Comparison Scenario
                </p>
                <div className="flex flex-col gap-2 mb-4">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setCompParam('mode', m.id)}
                      className={cn(
                        'px-3 py-2 rounded-lg border font-mono text-xs transition-all text-left',
                        comparisonParams.mode === m.id
                          ? 'border-purple-500/50 bg-purple-500/10 text-purple-300'
                          : 'border-white/10 text-white/30 hover:text-white/60',
                      )}
                    >
                      {m.label} — <span className="text-white/30">{m.desc}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => runCompare(comparisonParams)}
                  disabled={comparePending}
                  className="w-full py-3 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 font-mono text-xs uppercase tracking-widest hover:bg-purple-500/20 transition-colors"
                >
                  {comparePending ? '⟳ Running…' : 'Run Comparison'}
                </button>
              </motion.div>
            )}
          </div>

          {/* ── RIGHT: Results ─────────────────────────── */}
          <div className="xl:col-span-2 flex flex-col gap-6" ref={resultRef}>
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
                >
                  {/* Risk gauges */}
                  <div className="glass-panel border border-white/10 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-display text-sm text-white/80 uppercase tracking-widest">
                        Risk Assessment — {result.mode}
                        {comparisonResult && compareMode && (
                          <span className="ml-3 text-purple-400 text-[10px]">vs {comparisonResult.mode}</span>
                        )}
                      </h2>
                      <span className={cn(
                        'font-display text-xl font-bold',
                        (result.earth_health_delta ?? 0) < -20 ? 'text-red-400'
                          : (result.earth_health_delta ?? 0) < -10 ? 'text-orange-400'
                            : 'text-yellow-400',
                      )}>
                        Earth Health Δ: {result.earth_health_delta > 0 ? '+' : ''}
                        {result.earth_health_delta?.toFixed(1) ?? '—'}
                      </span>
                    </div>

                    <div className="flex justify-around gap-4 flex-wrap">
                      <RiskGauge
                        label="Flood Risk"
                        value={result.flood_risk_sim ?? 0}
                        color="#3b82f6"
                        icon="🌊"
                      />
                      <RiskGauge
                        label="Fire Risk"
                        value={result.fire_risk_sim ?? 0}
                        color="#f97316"
                        icon="🔥"
                      />
                      <RiskGauge
                        label="Climate Stress"
                        value={result.climate_stress_sim ?? 0}
                        color="#a855f7"
                        icon="🌡️"
                      />
                    </div>
                  </div>

                  {/* Impact metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: 'Economic Loss',
                        value: formatUSD(result.economic_loss_usd ?? 0),
                        accent: 'text-red-400',
                        icon: '💸',
                      },
                      {
                        label: 'Recovery Time',
                        value: `${(result.recovery_days ?? 0).toLocaleString()} days`,
                        accent: 'text-orange-400',
                        icon: '⏱️',
                      },
                      {
                        label: 'Affected Pop.',
                        value: formatNumber(result.affected_population ?? 0),
                        accent: 'text-yellow-400',
                        icon: '👥',
                      },
                      {
                        label: 'Session',
                        value: result.session_id?.slice(0, 8) + '…',
                        accent: 'text-white/60',
                        icon: '🔑',
                      },
                    ].map((m) => (
                      <div key={m.label} className="glass-panel border border-white/10 p-4">
                        <p className="font-mono text-[10px] text-white/30 uppercase">{m.icon} {m.label}</p>
                        <p className={cn('font-display text-lg font-bold mt-1', m.accent)}>{m.value}</p>
                        {comparisonResult && compareMode && m.label === 'Economic Loss' && (
                          <p className="font-mono text-[10px] text-purple-400 mt-0.5">
                            vs {formatUSD(comparisonResult.economic_loss_usd ?? 0)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Radar chart (comparison when active) */}
                  {radarData.length > 0 && (
                    <div className="glass-panel border border-white/10 p-5">
                      <h2 className="font-display text-sm text-white/80 uppercase tracking-widest mb-4">
                        Risk Profile {compareMode && comparisonResult ? '— Scenario Comparison' : ''}
                      </h2>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis
                              dataKey="subject"
                              tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'monospace' }}
                            />
                            <Radar
                              name={result.mode}
                              dataKey="A"
                              stroke="#f97316"
                              fill="#f97316"
                              fillOpacity={0.25}
                            />
                            {compareMode && comparisonResult && (
                              <Radar
                                name={comparisonResult.mode}
                                dataKey="B"
                                stroke="#a855f7"
                                fill="#a855f7"
                                fillOpacity={0.2}
                              />
                            )}
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {result.explanation && (
                    <div className="glass-panel border border-white/10 p-5">
                      <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-2">
                        Analysis
                      </p>
                      <p className="font-mono text-sm text-white/70 leading-relaxed">
                        {result.explanation}
                      </p>
                      {comparisonResult?.explanation && compareMode && (
                        <p className="font-mono text-sm text-purple-400/70 leading-relaxed mt-3 border-t border-purple-500/20 pt-3">
                          Comparison: {comparisonResult.explanation}
                        </p>
                      )}
                      <div className="mt-4 flex gap-3">
                        <Link
                          to="/earthgpt"
                          state={{ context: `Simulation result: ${result.mode} scenario - flood ${Math.round((result.flood_risk_sim ?? 0) * 100)}%, fire ${Math.round((result.fire_risk_sim ?? 0) * 100)}%` }}
                          className="font-mono text-xs px-3 py-2 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                        >
                          Ask EarthGPT →
                        </Link>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-panel border border-white/10 p-12 flex flex-col items-center justify-center gap-6 text-center"
                >
                  <div className="text-7xl opacity-20">⚡</div>
                  <div>
                    <p className="font-display text-lg text-white/30">Configure parameters and run a simulation</p>
                    <p className="font-mono text-xs text-white/20 mt-2">
                      Adjust sliders · Choose scenario · Click Run
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-left w-full max-w-md">
                    {[
                      { icon: '🌊', label: 'Flood model', desc: 'Rainfall + humidity + climate' },
                      { icon: '🔥', label: 'Fire model', desc: 'Dryness + wind + temperature' },
                      { icon: '🌡️', label: 'Climate model', desc: 'Multi-factor stress index' },
                    ].map((f) => (
                      <div key={f.label} className="bg-white/5 rounded-lg p-3">
                        <span className="text-2xl">{f.icon}</span>
                        <p className="font-mono text-xs text-white/60 mt-1">{f.label}</p>
                        <p className="font-mono text-[10px] text-white/30 mt-0.5">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Simulation History */}
            <div className="glass-panel border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-sm text-white/80 uppercase tracking-widest">
                  Simulation History
                </h2>
                <span className="font-mono text-xs text-white/30">{history.length} runs</span>
              </div>

              {historyLoading ? (
                <p className="font-mono text-xs text-white/30 text-center py-6 animate-pulse">Loading…</p>
              ) : history.length === 0 ? (
                <p className="font-mono text-xs text-white/20 text-center py-6">
                  No simulations yet — run one above
                </p>
              ) : (
                <div className="space-y-1">
                  {history.map((h, i) => (
                    <HistoryRow
                      key={h.session_id ?? i}
                      sim={h}
                      onClick={() => setResult(h)}
                    />
                  ))}
                </div>
              )}

              {history.length > 0 && (
                <div className="mt-5">
                  <p className="font-mono text-[10px] text-white/30 uppercase mb-3">Run History — Flood vs Fire</p>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historyBarData} barSize={12}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'monospace' }} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'monospace' }} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11 }}
                          formatter={(v: number) => [`${v}%`]}
                        />
                        <Bar dataKey="flood" name="Flood" fill="#3b82f6" radius={[3, 3, 0, 0]}>
                          {historyBarData.map((_, i) => (
                            <Cell key={i} fill="#3b82f6" />
                          ))}
                        </Bar>
                        <Bar dataKey="fire" name="Fire" fill="#f97316" radius={[3, 3, 0, 0]}>
                          {historyBarData.map((_, i) => (
                            <Cell key={i} fill="#f97316" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
