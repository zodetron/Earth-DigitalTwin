import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { agentApi } from '@/services/agentApi'
import { cn } from '@/lib/utils'
import type { EarthGPTMessage, ReportType } from '@/types'

// ─── Quick question groups ────────────────────────────────────────────────────

const QUICK_QUESTIONS: { label: string; icon: string; color: string; queries: string[] }[] = [
  {
    label: 'Flood',
    icon: '🌊',
    color: 'text-blue-400 border-blue-500/30 hover:bg-blue-500/10',
    queries: [
      'Which cities are at highest flood risk globally right now?',
      'Explain the key factors driving flood risk in Southeast Asia.',
      'How does monsoon intensity affect flood prediction accuracy?',
      'What SHAP features most influence flood probability scores?',
    ],
  },
  {
    label: 'Wildfire',
    icon: '🔥',
    color: 'text-orange-400 border-orange-500/30 hover:bg-orange-500/10',
    queries: [
      'Which countries are experiencing the most severe wildfires in 2024?',
      'What fire radiative power levels indicate catastrophic wildfire risk?',
      'How does vegetation dryness correlate with fire spread speed?',
      'Summarize wildfire patterns across the Amazon and Congo Basin.',
    ],
  },
  {
    label: 'Climate',
    icon: '🌡️',
    color: 'text-green-400 border-green-500/30 hover:bg-green-500/10',
    queries: [
      'What does a 2050 climate scenario mean for coastal megacities?',
      'How does a 3°C temperature rise affect global flood frequency?',
      'Which regions face compounding fire and flood risk by 2040?',
      'Explain the relationship between urbanization and climate stress.',
    ],
  },
  {
    label: 'Global',
    icon: '🌍',
    color: 'text-purple-400 border-purple-500/30 hover:bg-purple-500/10',
    queries: [
      'What is the current Earth Health Score and what is driving it?',
      'Which continent has the highest combined disaster risk index?',
      'Summarize the top 5 global environmental threats right now.',
      'What is the EarthMind Risk Index formula and what does it measure?',
    ],
  },
]

const REPORT_TYPES: { type: ReportType; label: string; icon: string; desc: string }[] = [
  { type: 'EMERGENCY_BULLETIN', label: 'Emergency Bulletin', icon: '🚨', desc: '24-hour incident report' },
  { type: 'GOVERNMENT_BRIEFING', label: 'Gov. Briefing', icon: '🏛️', desc: 'Policy-level summary' },
  { type: 'NGO_ACTION_PLAN', label: 'NGO Action Plan', icon: '🤝', desc: 'Response coordination' },
  { type: 'CITIZEN_SAFETY_GUIDE', label: 'Safety Guide', icon: '📋', desc: 'Public guidance' },
  { type: 'INVESTOR_RISK', label: 'Investor Risk', icon: '📊', desc: 'Financial exposure' },
  { type: 'CLIMATE_RISK', label: 'Climate Risk', icon: '🌡️', desc: 'Long-term projection' },
]

// ─── Small components ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-yellow-400/70"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}

function MessageBubble({ msg }: { msg: EarthGPTMessage & { confidence?: number } }) {
  const isUser = msg.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-1',
        isUser ? 'bg-white/10' : 'bg-yellow-500/20 border border-yellow-500/30',
      )}>
        {isUser ? '👤' : '🤖'}
      </div>

      <div className={cn('flex flex-col gap-1.5 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        {/* Bubble */}
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-white/10 text-white/90 rounded-tr-sm'
            : 'bg-yellow-500/10 border border-yellow-500/20 text-white/85 rounded-tl-sm',
        )}>
          <p className="font-mono text-sm whitespace-pre-wrap">{msg.content}</p>
        </div>

        {/* Meta row */}
        <div className={cn('flex items-center gap-2 flex-wrap', isUser ? 'justify-end' : 'justify-start')}>
          <span className="font-mono text-[10px] text-white/20">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </span>

          {!isUser && msg.confidence !== undefined && (
            <div className="flex items-center gap-1">
              <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-yellow-400"
                  style={{ width: `${msg.confidence * 100}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-yellow-400/60">
                {Math.round(msg.confidence * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {msg.sources.map((src) => (
              <span key={src} className="font-mono text-[9px] px-2 py-0.5 rounded border border-white/10 text-white/30">
                📎 {src}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function EarthGPTPage() {
  const location = useLocation()
  const contextFromState = (location.state as { context?: string } | null)?.context ?? ''

  const [messages, setMessages] = useState<(EarthGPTMessage & { confidence?: number })[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello, I'm EarthGPT — your AI copilot for planetary disaster intelligence.\n\nI can analyze flood risks, wildfire patterns, climate stress, simulation outcomes, and emergency scenarios using real satellite data and ML predictions from the EarthMind X platform.\n\nAsk me anything about Earth's risk landscape.",
      timestamp: new Date().toISOString(),
      sources: ['EarthMind X Knowledge Base'],
      confidence: 1.0,
    },
  ])
  const [input, setInput] = useState(contextFromState ? `Tell me about: ${contextFromState}` : '')
  const [isTyping, setIsTyping] = useState(false)
  const [report, setReport] = useState<{ type: ReportType; content: string } | null>(null)
  const [reportLoading, setReportLoading] = useState<ReportType | null>(null)
  const [activeTab, setActiveTab] = useState<'questions' | 'reports'>('questions')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-send if context came in from another page
  useEffect(() => {
    if (contextFromState) {
      const q = `Tell me about: ${contextFromState}`
      setInput(q)
    }
  }, [contextFromState])

  const { mutate: sendQuery } = useMutation({
    mutationFn: (q: string) =>
      agentApi.queryEarthGPT({ query: q, context: contextFromState ? contextFromState : undefined }),
    onMutate: (q) => {
      const userMsg: EarthGPTMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: q,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsTyping(true)
    },
    onSuccess: (data) => {
      setIsTyping(false)
      const assistantMsg: EarthGPTMessage & { confidence?: number } = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        sources: data.sources,
        confidence: data.confidence,
      }
      setMessages((prev) => [...prev, assistantMsg])
    },
    onError: () => {
      setIsTyping(false)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'I encountered an error connecting to the AI service. Please ensure the ANTHROPIC_API_KEY is configured in the AI service .env file.',
          timestamp: new Date().toISOString(),
          sources: [],
          confidence: 0,
        },
      ])
    },
  })

  const handleSend = useCallback(() => {
    const q = input.trim()
    if (!q || isTyping) return
    sendQuery(q)
  }, [input, isTyping, sendQuery])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleGenerateReport = async (type: ReportType) => {
    setReportLoading(type)
    setReport(null)
    try {
      const result = await agentApi.generateReport(type, 'GLOBAL')
      setReport({ type, content: result.content ?? result.title ?? JSON.stringify(result) })
    } catch {
      setReport({ type, content: 'Error generating report. Please check the AI service configuration.' })
    } finally {
      setReportLoading(null)
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: "Conversation cleared. I'm ready for your next question.",
        timestamp: new Date().toISOString(),
        sources: ['EarthMind X Knowledge Base'],
        confidence: 1.0,
      },
    ])
  }

  return (
    <div className="h-screen bg-space-dark text-white flex flex-col overflow-hidden">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-md flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <h1 className="font-display text-2xl gradient-text">EARTHGPT COPILOT</h1>
              <span className="px-2 py-0.5 border border-yellow-500/40 bg-yellow-500/10 text-yellow-400 font-mono text-[10px] uppercase rounded">
                claude-sonnet-4-6
              </span>
            </div>
            <p className="font-mono text-xs text-white/40 mt-1">
              AI-powered planetary intelligence · Real-time disaster data · VIIRS + XGBoost + SHAP
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearChat}
              className="font-mono text-xs text-white/30 hover:text-white/70 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              Clear
            </button>
            <Link
              to="/command"
              className="font-mono text-xs text-white/40 hover:text-white/80 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              ← COMMAND
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex max-w-screen-2xl w-full mx-auto px-6 py-6 gap-6">
        {/* ── CHAT PANEL ───────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Context pill */}
          {contextFromState && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex-shrink-0"
            >
              <span className="text-sm">📍</span>
              <span className="font-mono text-xs text-yellow-400/80">Context: {contextFromState}</span>
              <button
                onClick={() => setInput('')}
                className="ml-auto text-white/30 hover:text-white/60 font-mono text-xs"
              >
                ✕
              </button>
            </motion.div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-5 pr-2 scrollbar-thin">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}

            {/* Typing indicator */}
            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-sm flex-shrink-0">
                    🤖
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl rounded-tl-sm">
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 glass-panel border border-white/10 p-3 rounded-2xl">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask EarthGPT about flood risks, wildfires, climate scenarios, emergency plans…"
              rows={3}
              className="w-full bg-transparent font-mono text-sm text-white placeholder-white/20 resize-none outline-none leading-relaxed"
              disabled={isTyping}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="font-mono text-[10px] text-white/20">
                Enter to send · Shift+Enter for new line
              </span>
              <div className="flex items-center gap-2">
                {input.trim() && (
                  <span className="font-mono text-[10px] text-white/20">{input.length} chars</span>
                )}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className={cn(
                    'px-4 py-2 rounded-xl font-mono text-xs uppercase tracking-wider transition-all',
                    input.trim() && !isTyping
                      ? 'bg-yellow-400/20 border border-yellow-400/50 text-yellow-300 hover:bg-yellow-400/30'
                      : 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed',
                  )}
                >
                  {isTyping ? 'Thinking…' : 'Send ⏎'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Tab switcher */}
          <div className="flex rounded-lg border border-white/10 overflow-hidden flex-shrink-0">
            {(['questions', 'reports'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 font-mono text-xs py-2 uppercase tracking-wider transition-colors',
                  activeTab === tab
                    ? 'bg-white/10 text-white'
                    : 'text-white/30 hover:text-white/60',
                )}
              >
                {tab === 'questions' ? '💬 Quick Ask' : '📄 Reports'}
              </button>
            ))}
          </div>

          {/* Quick questions tab */}
          {activeTab === 'questions' && (
            <div className="flex flex-col gap-4">
              {QUICK_QUESTIONS.map((group) => (
                <div key={group.label} className="glass-panel border border-white/10 p-4">
                  <p className={cn('font-mono text-[10px] uppercase tracking-widest mb-3', group.color.split(' ')[0])}>
                    {group.icon} {group.label} Intelligence
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {group.queries.map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          setInput(q)
                          inputRef.current?.focus()
                        }}
                        className={cn(
                          'text-left font-mono text-[11px] text-white/50 hover:text-white/90 px-2 py-1.5 rounded-lg border transition-all leading-snug',
                          group.color,
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reports tab */}
          {activeTab === 'reports' && (
            <div className="flex flex-col gap-4">
              <div className="glass-panel border border-white/10 p-4">
                <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest mb-3">
                  AI Report Generation
                </p>
                <p className="font-mono text-[10px] text-white/25 mb-4 leading-relaxed">
                  Generate structured reports powered by EarthMind X data and Claude AI.
                </p>
                <div className="flex flex-col gap-2">
                  {REPORT_TYPES.map((r) => (
                    <button
                      key={r.type}
                      onClick={() => handleGenerateReport(r.type)}
                      disabled={reportLoading !== null}
                      className={cn(
                        'flex items-start gap-2 text-left px-3 py-2.5 rounded-lg border font-mono text-xs transition-all',
                        reportLoading === r.type
                          ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400 animate-pulse'
                          : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/80',
                      )}
                    >
                      <span className="text-base flex-shrink-0">{r.icon}</span>
                      <div>
                        <span className="block font-semibold">{r.label}</span>
                        <span className="text-white/30 text-[10px]">{r.desc}</span>
                      </div>
                      {reportLoading === r.type && (
                        <span className="ml-auto text-yellow-400 animate-spin">⟳</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generated report */}
              <AnimatePresence>
                {report && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="glass-panel border border-yellow-500/20 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-mono text-[10px] text-yellow-400 uppercase">
                        {REPORT_TYPES.find((r) => r.type === report.type)?.label ?? report.type}
                      </p>
                      <button
                        onClick={() => setReport(null)}
                        className="text-white/30 hover:text-white/70 font-mono text-xs"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      <p className="font-mono text-[11px] text-white/65 whitespace-pre-wrap leading-relaxed">
                        {report.content}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setInput(`Summarize this report and give me the key action items: ${report.content.slice(0, 500)}`)
                        setActiveTab('questions')
                        inputRef.current?.focus()
                      }}
                      className="mt-3 w-full font-mono text-[10px] py-2 rounded border border-yellow-500/30 text-yellow-400/70 hover:bg-yellow-500/10 transition-colors"
                    >
                      Ask EarthGPT to analyze →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Stats */}
          <div className="glass-panel border border-white/10 p-4 flex-shrink-0">
            <p className="font-mono text-[10px] text-white/30 uppercase tracking-widest mb-3">Session</p>
            <div className="space-y-1.5">
              {[
                { label: 'Messages', val: messages.length.toString() },
                { label: 'Questions', val: messages.filter((m) => m.role === 'user').length.toString() },
                {
                  label: 'Avg Confidence',
                  val: (() => {
                    const assistantMsgs = messages.filter((m) => m.role === 'assistant' && m.confidence !== undefined)
                    if (!assistantMsgs.length) return '—'
                    const avg = assistantMsgs.reduce((s, m) => s + (m.confidence ?? 0), 0) / assistantMsgs.length
                    return `${Math.round(avg * 100)}%`
                  })(),
                },
              ].map((s) => (
                <div key={s.label} className="flex justify-between">
                  <span className="font-mono text-[10px] text-white/30">{s.label}</span>
                  <span className="font-mono text-[10px] text-white/70">{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
