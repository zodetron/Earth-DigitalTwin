import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Landing() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Animated star field
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const stars = Array.from({ length: 300 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5,
      a: Math.random(),
      speed: Math.random() * 0.005 + 0.002,
    }))

    let frame: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach((s) => {
        s.a += s.speed
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * Math.abs(Math.sin(s.a))})`
        ctx.fill()
      })
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-space-dark flex flex-col items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Background glow */}
      <div className="absolute inset-0 bg-glow-radial pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center gap-8 px-4"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-20 h-20 rounded-full border-2 border-cyan-400/60 flex items-center justify-center animate-pulse-glow">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400/40 to-blue-600/40 backdrop-blur-sm flex items-center justify-center">
              <span className="text-3xl">🌍</span>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col items-center gap-3">
          <h1 className="font-display text-6xl md:text-8xl font-black tracking-wider gradient-text">
            EARTHMIND X
          </h1>
          <p className="text-cyan-400/80 font-mono text-sm md:text-base tracking-[0.3em] uppercase">
            AI-Powered Digital Twin Earth
          </p>
        </div>

        <p className="text-white/50 text-lg max-w-xl leading-relaxed">
          Real-time planetary intelligence. Predicts disasters. Simulates futures.
          Protects civilizations.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/command')}
            className="px-8 py-4 bg-cyan-500 text-space-dark font-display font-bold text-sm tracking-widest rounded-lg hover:bg-cyan-400 transition-colors glow-border"
          >
            ENTER COMMAND CENTER
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/earthgpt')}
            className="px-8 py-4 glass-panel font-display font-bold text-sm tracking-widest text-cyan-400 border-cyan-500/40 hover:border-cyan-400/60 transition-all"
          >
            ASK EARTHGPT
          </motion.button>
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="flex gap-8 mt-6"
        >
          {[
            { label: 'CITIES MONITORED', value: '7,800+' },
            { label: 'AI AGENTS', value: '7' },
            { label: 'DATA SOURCES', value: '180+' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span className="font-display text-2xl font-bold text-cyan-400 glow-text">{s.value}</span>
              <span className="font-mono text-xs text-white/30 tracking-widest">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom scan line */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="font-mono text-xs text-cyan-400/50 tracking-widest"
        >
          ◉ SYSTEM ONLINE — ALL AGENTS ACTIVE
        </motion.div>
      </div>
    </div>
  )
}
