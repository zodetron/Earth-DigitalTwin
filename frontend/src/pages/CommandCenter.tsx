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

const LAYERS: { id: GlobeLayer; label: string; icon: string; activeClass: string }[] = [
  { id: 'risk',    label: 'Risk Index', icon: '⚠️', activeClass: 'bg-violet-100 border-violet-400 text-violet-700' },
  { id: 'flood',   label: 'Flood',      icon: '🌊', activeClass: 'bg-blue-100 border-blue-400 text-blue-700' },
  { id: 'fire',    label: 'Wildfire',   icon: '🔥', activeClass: 'bg-orange-100 border-orange-400 text-orange-700' },
  { id: 'climate', label: 'Climate',    icon: '🌡️', activeClass: 'bg-emerald-100 border-emerald-400 text-emerald-700' },
]

const FUTURE_MODES: { id: FutureMode; label: string }[] = [
  { id: 'current', label: 'Now' },
  { id: '2030',    label: '2030' },
  { id: '2040',    label: '2040' },
  { id: '2050',    label: '2050' },
  { id: 'worst',   label: 'Worst' },
]

const NAV = [
  { to: '/flood',      label: 'Flood',      icon: '🌊' },
  { to: '/fire',       label: 'Fire',        icon: '🔥' },
  { to: '/simulation', label: 'Simulation',  icon: '⚡' },
  { to: '/earthgpt',   label: 'EarthGPT',   icon: '🤖' },
  { to: '/analytics',  label: 'Analytics',  icon: '📊' },
]

// ─── Earth Health Ring ────────────────────────────────────────────────────────

function EarthHealthRing({ score }: { score: number }) {
  const color = score >= 70 ? '#16a34a' : score >= 50 ? '#ca8a04' : '#dc2626'
  const r = 34
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
        <circle cx="42" cy="42" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="42" cy="42" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{score.toFixed(0)}</span>
        <span className="text-[9px] text-slate-400 font-mono">/ 100</span>
      </div>
    </div>
  )
}

// ─── City Detail Panel ────────────────────────────────────────────────────────

function CityDetailPanel({ city, onClose }: { city: CityWithRisk; onClose: () => void }) {
  const risk = city.risk
  const level = riskToLevel(risk?.earthmindRiskIndex ?? 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-xl p-4 flex flex-col gap-3 max-h-[65vh] overflow-y-auto"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">{city.name}</h3>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            {city.country} · {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
          </p>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-600 text-lg leading-none">✕</button>
      </div>

      <div className="flex items-center gap-2">
        <span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase', riskBgClass(level))}>
          {level}
        </span>
        {city.population && (
          <span className="text-[10px] text-slate-500">Pop: {formatNumber(city.population)}</span>
        )}
      </div>

      {risk && (
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Risk Index',     value: (risk.earthmindRiskIndex * 100).toFixed(1) + '%', hi: true },
            { label: 'Flood Risk',     value: (risk.floodRisk * 100).toFixed(1) + '%' },
            { label: 'Fire Risk',      value: (risk.fireRisk * 100).toFixed(1) + '%' },
            { label: 'Climate Stress', value: (risk.climateStress * 100).toFixed(1) + '%' },
            { label: 'Env. Risk',      value: (risk.environmentalRisk * 100).toFixed(1) + '%' },
            { label: 'Pop. Exposure',  value: (risk.populationExposure * 100).toFixed(1) + '%' },
          ].map((m) => (
            <div key={m.label} className="bg-slate-50 rounded-xl p-2 border border-slate-100">
              <p className="text-[9px] text-slate-400 font-mono uppercase">{m.label}</p>
              <p className={cn('text-sm font-bold mt-0.5', m.hi ? 'text-violet-600' : 'text-slate-700')}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-1">
        <Link
          to="/flood"
          state={{ cityId: city.id }}
          className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
        >
          Flood Detail
        </Link>
        <Link
          to="/earthgpt"
          state={{ context: `Risk assessment for ${city.name}, ${city.country}` }}
          className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors"
        >
          Ask EarthGPT
        </Link>
      </div>
    </motion.div>
  )
}

// ─── Command Center ───────────────────────────────────────────────────────────

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

  useEffect(() => { if (healthData) setEarthHealth(healthData) }, [healthData, setEarthHealth])
  useEffect(() => { if (pointsData) setGlobePoints(pointsData) }, [pointsData, setGlobePoints])
  useEffect(() => { if (fireData) setFireHotspots(fireData) }, [fireData, setFireHotspots])

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
    try { await earthApi.triggerScan() } finally { stopScan() }
  }

  const health = earthHealth
  const healthScore = health?.score ?? 0
  const scoreColor = healthScore >= 70 ? 'text-emerald-600' : healthScore >= 50 ? 'text-amber-600' : 'text-red-600'
  const dotColor   = healthScore >= 70 ? 'bg-emerald-500' : healthScore >= 50 ? 'bg-amber-500' : 'bg-red-500'

  const pointCount = activeLayer === 'fire' ? fireHotspots.length : globePoints.length

  return (
    <div className="w-screen h-screen bg-slate-100 overflow-hidden relative">

      {/* ── Full-screen Globe ───────────────────────────── */}
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
            animate={{ scale: 2.8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute rounded-full border-2 border-blue-500/50 pointer-events-none"
            style={{ width: 200, height: 200, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          />
        )}
      </AnimatePresence>

      {/* ── TOP BAR ────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 bg-white/70 backdrop-blur-md border-b border-slate-200/80">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className={cn('w-2 h-2 rounded-full animate-pulse', dotColor)} />
          <span className="font-bold text-slate-800 tracking-wider text-sm">EARTHMIND X</span>
          <span className="text-[10px] text-slate-400 border border-slate-200 px-2 py-0.5 rounded-full font-mono">
            COMMAND CENTER
          </span>
        </div>

        {/* Nav */}
        <div className="flex items-center gap-1">
          {NAV.map((n) => (
            <button
              key={n.to}
              onClick={() => navigate(n.to)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
            >
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </div>

        {/* Earth Health */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Earth Health</span>
          <span className={cn('text-base font-bold', scoreColor)}>
            {health ? `${healthScore.toFixed(1)}` : '—'}
            <span className="text-[10px] text-slate-400 font-normal">/100</span>
          </span>
        </div>
      </div>

      {/* ── LEFT PANEL ─────────────────────────────────── */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 w-52">
        {/* Health ring */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col items-center gap-3"
        >
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest self-start">Earth Health</p>
          {health && <EarthHealthRing score={healthScore} />}
          {health && (
            <div className="w-full space-y-1.5">
              {[
                { label: 'Cities Monitored', val: health.totalCitiesMonitored.toLocaleString(), warn: false },
                { label: 'Critical Zones',   val: health.criticalZones.toString(),              warn: true },
                { label: 'High Risk',        val: health.highRiskZones.toString(),              warn: true },
              ].map((m) => (
                <div key={m.label} className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400">{m.label}</span>
                  <span className={cn('text-[10px] font-semibold', m.warn ? 'text-orange-500' : 'text-slate-600')}>
                    {m.val}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Live data */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-4"
        >
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-3">Live Data</p>
          <div className="space-y-2">
            {[
              { icon: '📍', label: 'Risk Points',   val: globePoints.length.toLocaleString() },
              { icon: '🔥', label: 'Fire Hotspots', val: fireHotspots.length.toLocaleString() },
              { icon: '🌊', label: 'Flood Cities',  val: globePoints.length.toLocaleString() },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">{m.icon} {m.label}</span>
                <span className="text-[10px] font-semibold text-slate-700">{m.val}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────── */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 w-52">
        {/* Layer selector */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-4"
        >
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-3">Data Layer</p>
          <div className="flex flex-col gap-1.5">
            {LAYERS.map((l) => (
              <button
                key={l.id}
                onClick={() => setActiveLayer(l.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                  activeLayer === l.id
                    ? l.activeClass
                    : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50',
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

        {/* Future scenario */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-4"
        >
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-3">Scenario</p>
          <div className="flex flex-wrap gap-1.5">
            {FUTURE_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setFutureMode(m.id)}
                className={cn(
                  'text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors',
                  futureMode === m.id
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          {futureMode !== 'current' && (
            <p className="text-[10px] text-amber-600 mt-2 font-medium">
              ⚠ Projected: {futureMode === 'worst' ? 'worst case' : futureMode}
            </p>
          )}
        </motion.div>

        {/* Globe controls */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm p-4"
        >
          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-3">Controls</p>
          <div className="flex flex-col gap-1.5">
            {[
              { label: `Auto-Rotate: ${globeAutoRotate ? 'ON' : 'OFF'}`, onClick: toggleRotation, active: globeAutoRotate },
              { label: `Atmosphere: ${showAtmosphere ? 'ON' : 'OFF'}`, onClick: () => toggleLayer('showAtmosphere'), active: showAtmosphere },
            ].map((c) => (
              <button
                key={c.label}
                onClick={c.onClick}
                className={cn(
                  'text-[10px] font-medium px-3 py-2 rounded-xl border transition-colors text-left',
                  c.active
                    ? 'border-sky-300 bg-sky-50 text-sky-700'
                    : 'border-slate-200 text-slate-400 hover:text-slate-600',
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
              onClose={() => { setSelectedCityData(null); setSelectedCity(null) }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── BOTTOM TOOLBAR ─────────────────────────────── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm px-4 py-2.5 flex items-center gap-3">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => setActiveLayer(l.id)}
              className={cn(
                'flex items-center gap-1.5 text-[10px] font-semibold uppercase px-2.5 py-1.5 rounded-xl transition-all',
                activeLayer === l.id ? l.activeClass + ' border' : 'text-slate-400 hover:text-slate-700',
              )}
            >
              {l.icon} {l.label}
            </button>
          ))}

          <div className="w-px h-4 bg-slate-200" />

          <button
            onClick={handleScan}
            disabled={isScanning}
            className={cn(
              'flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-xl border transition-all',
              isScanning
                ? 'border-blue-300 bg-blue-50 text-blue-600 animate-pulse'
                : 'border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50',
            )}
          >
            {isScanning ? '⟳ SCANNING…' : '⟳ SCAN EARTH'}
          </button>

          <div className="w-px h-4 bg-slate-200" />

          {NAV.slice(0, 4).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-[16px] hover:scale-125 transition-transform"
              title={n.label}
            >
              {n.icon}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Bottom corner info ─────────────────────────── */}
      <div className="absolute bottom-4 left-4 text-[10px] text-slate-400 font-mono pointer-events-none leading-relaxed">
        <p>{pointCount.toLocaleString()} points · {activeLayer.toUpperCase()} layer</p>
        <p>EMX v2.0 · XGBoost R²=0.81</p>
      </div>

      <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 font-mono text-right pointer-events-none leading-relaxed">
        <p>VIIRS · 192,000 detections</p>
        <p>{globePoints.length.toLocaleString()} cities monitored</p>
      </div>
    </div>
  )
}
