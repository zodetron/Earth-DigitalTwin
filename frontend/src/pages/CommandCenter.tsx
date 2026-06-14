import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import EarthGlobe from '@/components/globe/EarthGlobe'
import { useEarthStore } from '@/stores/earthStore'
import { earthApi } from '@/services/earthApi'
import { fireApi } from '@/services/fireApi'
import { cn, riskBgClass, riskToLevel, formatNumber } from '@/lib/utils'
import type { GlobeLayer, FutureMode, CityWithRisk } from '@/types'

// ─── Layer config ─────────────────────────────────────────────────────────────

const LAYERS: { id: GlobeLayer; label: string; icon: string; color: string }[] = [
  { id: 'risk', label: 'Risk Index', icon: '⚠️', color: 'border-purple-500/60 text-purple-400' },
  { id: 'flood', label: 'Flood', icon: '🌊', color: 'border-blue-500/60 text-blue-400' },
  { id: 'fire', label: 'Wildfire', icon: '🔥', color: 'border-orange-500/60 text-orange-400' },
  { id: 'climate', label: 'Climate', icon: '🌡️', color: 'border-green-500/60 text-green-400' },
]

const FUTURE_MODES: { id: FutureMode; label: string }[] = [
  { id: 'current', label: 'Now' },
  { id: '2030', label: '2030' },
  { id: '2040', label: '2040' },
  { id: '2050', label: '2050' },
  { id: 'worst', label: 'Worst' },
]

// ─── Nav links ────────────────────────────────────────────────────────────────

const NAV = [
  { to: '/flood', label: 'FLOOD', icon: '🌊' },
  { to: '/fire', label: 'FIRE', icon: '🔥' },
  { to: '/climate', label: 'CLIMATE', icon: '🌡️' },
  { to: '/simulation', label: 'SIM', icon: '⚡' },
  { to: '/earthgpt', label: 'GPT', icon: '🤖' },
  { to: '/analytics', label: 'ANALYTICS', icon: '📊' },
]

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function EarthHealthRing({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'
  const r = 36
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="relative w-24 h-24">
      <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-bold" style={{ color }}>{score.toFixed(0)}</span>
        <span className="font-mono text-[9px] text-white/40">/ 100</span>
      </div>
    </div>
  )
}

function CityDetailPanel({
  city,
  onClose,
}: {
  city: CityWithRisk
  onClose: () => void
}) {
  const risk = city.risk
  const level = riskToLevel(risk?.earthmindRiskIndex ?? 0)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="glass-panel border border-white/10 p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-base text-white">{city.name}</h3>
          <p className="font-mono text-xs text-white/40">
            {city.country} · {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
          </p>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white/80 font-mono">✕</button>
      </div>

      <div className="flex items-center gap-3">
        <span className={cn('px-2 py-0.5 rounded border font-mono text-[10px] uppercase', riskBgClass(level))}>
          {level}
        </span>
        <span className="font-mono text-xs text-white/60">
          Pop: {city.population ? formatNumber(city.population) : '—'}
        </span>
      </div>

      {risk && (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Risk Index', value: (risk.earthmindRiskIndex * 100).toFixed(1) + '%', accent: true },
            { label: 'Flood Risk', value: (risk.floodRisk * 100).toFixed(1) + '%' },
            { label: 'Fire Risk', value: (risk.fireRisk * 100).toFixed(1) + '%' },
            { label: 'Climate Stress', value: (risk.climateStress * 100).toFixed(1) + '%' },
            { label: 'Env. Risk', value: (risk.environmentalRisk * 100).toFixed(1) + '%' },
            { label: 'Pop. Exposure', value: (risk.populationExposure * 100).toFixed(1) + '%' },
          ].map((m) => (
            <div key={m.label} className="bg-white/5 rounded-lg p-2">
              <p className="font-mono text-[10px] text-white/40">{m.label}</p>
              <p className={cn('font-display text-sm mt-0.5', m.accent ? 'text-yellow-300' : 'text-white')}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        <Link
          to="/flood"
          state={{ cityId: city.id }}
          className="flex-1 text-center font-mono text-[10px] py-1.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
        >
          Flood Detail
        </Link>
        <Link
          to="/earthgpt"
          state={{ context: `Risk assessment for ${city.name}, ${city.country}` }}
          className="flex-1 text-center font-mono text-[10px] py-1.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors"
        >
          Ask EarthGPT
        </Link>
      </div>
    </motion.div>
  )
}

// ─── Main Command Center ─────────────────────────────────────────────────────

export default function CommandCenter() {
  const navigate = useNavigate()
  const {
    activeLayer, setActiveLayer,
    futureMode, setFutureMode,
    globePoints, setGlobePoints,
    fireHotspots, setFireHotspots,
    earthHealth, setEarthHealth,
    showAtmosphere, toggleLayer,
    globeAutoRotate, toggleRotation,
    isScanning, startScan, stopScan,
    selectedCity, setSelectedCity,
  } = useEarthStore()

  const [selectedCityData, setSelectedCityData] = useState<CityWithRisk | null>(null)

  // Load globe points
  const { data: healthData } = useQuery({
    queryKey: ['earth', 'health'],
    queryFn: earthApi.getHealth,
    refetchInterval: 30_000,
  })

  const { data: pointsData } = useQuery({
    queryKey: ['earth', 'globe-points'],
    queryFn: earthApi.getGlobePoints,
    staleTime: 5 * 60_000,
  })

  const { data: fireData } = useQuery({
    queryKey: ['fire', 'hotspots', 1000],
    queryFn: () => fireApi.getHotspots(1000),
    staleTime: 5 * 60_000,
  })

  // Sync to store
  useEffect(() => {
    if (healthData) setEarthHealth(healthData)
  }, [healthData, setEarthHealth])

  useEffect(() => {
    if (pointsData) setGlobePoints(pointsData)
  }, [pointsData, setGlobePoints])

  useEffect(() => {
    if (fireData) setFireHotspots(fireData)
  }, [fireData, setFireHotspots])

  const handleCityClick = async (cityId: string) => {
    setSelectedCity(null)
    setSelectedCityData(null)
    try {
      const city = await earthApi.getCity(cityId)
      setSelectedCityData(city)
    } catch { /* ignore */ }
  }

  const handleScan = async () => {
    if (isScanning) return
    startScan()
    try {
      await earthApi.triggerScan()
    } finally {
      stopScan()
    }
  }

  const health = earthHealth
  const healthScore = health?.score ?? 0
  const healthColor = healthScore >= 70 ? 'text-green-400' : healthScore >= 50 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="w-screen h-screen bg-space-dark overflow-hidden relative">
      {/* ── Full-screen Globe ──────────────────────────────── */}
      <div className="absolute inset-0">
        <EarthGlobe
          activeLayer={activeLayer}
          globePoints={globePoints}
          fireHotspots={fireHotspots}
          autoRotate={globeAutoRotate}
          showAtmosphere={showAtmosphere}
          onCityClick={handleCityClick}
        />
      </div>

      {/* Scan pulse ring */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            key="scan-ring"
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 m-auto w-64 h-64 rounded-full border-2 border-yellow-400/60 pointer-events-none"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          />
        )}
      </AnimatePresence>

      {/* ── TOP BAR ───────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="font-display text-sm text-white/90 tracking-wider">EARTHMIND X</span>
          <span className="font-mono text-[10px] text-white/30 border border-white/10 px-2 py-0.5 rounded">
            COMMAND CENTER
          </span>
        </div>

        <div className="pointer-events-auto flex items-center gap-6">
          {NAV.map((n) => (
            <button
              key={n.to}
              onClick={() => navigate(n.to)}
              className="font-mono text-[10px] text-white/40 hover:text-white/90 transition-colors flex items-center gap-1"
            >
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </div>

        <div className="pointer-events-auto flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-[10px] text-white/30 uppercase">Earth Health</p>
            <p className={cn('font-display text-lg font-bold', healthColor)}>
              {health ? `${healthScore.toFixed(1)}/100` : '—'}
            </p>
          </div>
          <div className={cn('w-2 h-2 rounded-full', healthScore >= 60 ? 'bg-green-400' : 'bg-red-400', 'animate-pulse')} />
        </div>
      </div>

      {/* ── LEFT PANEL ────────────────────────────────────── */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 w-52">
        {/* Earth health ring */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel border border-white/10 p-4 flex flex-col items-center gap-2"
        >
          <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest">Earth Health</p>
          {health && <EarthHealthRing score={healthScore} />}
          {health && (
            <div className="w-full space-y-1.5 mt-1">
              {[
                { label: 'Cities Monitored', val: health.totalCitiesMonitored.toLocaleString() },
                { label: 'Critical Zones', val: health.criticalZones.toString(), warn: true },
                { label: 'High Risk', val: health.highRiskZones.toString(), warn: true },
              ].map((m) => (
                <div key={m.label} className="flex justify-between items-center">
                  <span className="font-mono text-[10px] text-white/30">{m.label}</span>
                  <span className={cn('font-mono text-[10px]', m.warn ? 'text-orange-400' : 'text-white/70')}>
                    {m.val}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel border border-white/10 p-4"
        >
          <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-3">Live Data</p>
          <div className="space-y-2">
            {[
              { icon: '📍', label: 'Globe Points', val: globePoints.length.toLocaleString() },
              { icon: '🔥', label: 'Fire Hotspots', val: fireHotspots.length.toLocaleString() },
              { icon: '🌊', label: 'Flood Cities', val: globePoints.length.toLocaleString() },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-white/40">
                  {m.icon} {m.label}
                </span>
                <span className="font-mono text-[10px] text-white/80">{m.val}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────── */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 w-56">
        {/* Layer controls */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel border border-white/10 p-4"
        >
          <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-3">Data Layer</p>
          <div className="flex flex-col gap-1.5">
            {LAYERS.map((l) => (
              <button
                key={l.id}
                onClick={() => setActiveLayer(l.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-xs transition-all',
                  activeLayer === l.id
                    ? l.color + ' bg-white/5'
                    : 'border-white/10 text-white/40 hover:text-white/70',
                )}
              >
                <span>{l.icon}</span>
                <span>{l.label}</span>
                {activeLayer === l.id && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Future mode */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel border border-white/10 p-4"
        >
          <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-3">
            Future Scenario
          </p>
          <div className="flex flex-wrap gap-1.5">
            {FUTURE_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setFutureMode(m.id)}
                className={cn(
                  'font-mono text-[10px] px-2.5 py-1.5 rounded border transition-colors',
                  futureMode === m.id
                    ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-400'
                    : 'border-white/10 text-white/40 hover:text-white/70',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          {futureMode !== 'current' && (
            <p className="font-mono text-[10px] text-yellow-400/70 mt-2">
              ⚠️ Projected scenario for {futureMode === 'worst' ? 'worst case' : futureMode}
            </p>
          )}
        </motion.div>

        {/* Globe controls */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel border border-white/10 p-4"
        >
          <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-3">Controls</p>
          <div className="flex flex-col gap-2">
            {[
              {
                label: globeAutoRotate ? 'Auto-Rotate: ON' : 'Auto-Rotate: OFF',
                onClick: toggleRotation,
                active: globeAutoRotate,
              },
              {
                label: showAtmosphere ? 'Atmosphere: ON' : 'Atmosphere: OFF',
                onClick: () => toggleLayer('showAtmosphere'),
                active: showAtmosphere,
              },
            ].map((c) => (
              <button
                key={c.label}
                onClick={c.onClick}
                className={cn(
                  'font-mono text-[10px] px-3 py-2 rounded-lg border transition-colors text-left',
                  c.active
                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                    : 'border-white/10 text-white/40',
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* City detail */}
        <AnimatePresence mode="wait">
          {selectedCityData && (
            <CityDetailPanel
              key={selectedCityData.id}
              city={selectedCityData}
              onClose={() => {
                setSelectedCityData(null)
                setSelectedCity(null)
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM TOOLBAR ────────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <div className="glass-panel border border-white/10 px-4 py-3 flex items-center gap-4">
          {/* Layer quick-select */}
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveLayer(l.id)}
              className={cn(
                'flex items-center gap-1.5 font-mono text-[10px] uppercase transition-colors px-2 py-1 rounded',
                activeLayer === l.id ? 'text-white bg-white/10' : 'text-white/30 hover:text-white/70',
              )}
            >
              {l.icon} {l.label}
            </button>
          ))}

          <div className="w-px h-5 bg-white/10" />

          {/* Scan */}
          <button
            onClick={handleScan}
            disabled={isScanning}
            className={cn(
              'flex items-center gap-1.5 font-mono text-[10px] px-3 py-1.5 rounded border transition-all',
              isScanning
                ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-400 animate-pulse'
                : 'border-white/20 text-white/50 hover:border-yellow-500/40 hover:text-yellow-400',
            )}
          >
            {isScanning ? '⟳ SCANNING…' : '⟳ SCAN EARTH'}
          </button>

          <div className="w-px h-5 bg-white/10" />

          {/* Page links */}
          {NAV.slice(0, 4).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="font-mono text-[10px] text-white/30 hover:text-white/80 transition-colors px-1"
            >
              {n.icon}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Coordinate readout (decorative) ───────────────── */}
      <div className="absolute bottom-4 left-4 font-mono text-[10px] text-white/20 pointer-events-none">
        <p>LAT {(Math.random() * 180 - 90).toFixed(4)}°</p>
        <p>LNG {(Math.random() * 360 - 180).toFixed(4)}°</p>
        <p>ALT 280 km</p>
      </div>

      {/* ── Status ticker ─────────────────────────────────── */}
      <div className="absolute bottom-4 right-4 font-mono text-[10px] text-white/20 text-right pointer-events-none">
        <p>VIIRS · 192,000 detections</p>
        <p>{globePoints.length.toLocaleString()} cities monitored</p>
        <p>EMX v2.0 · XGBoost R²=0.81</p>
      </div>
    </div>
  )
}
