import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RiskLevel } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function riskColor(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    LOW: '#00ff88',
    MODERATE: '#ffcc00',
    HIGH: '#ff6600',
    CRITICAL: '#ff0033',
  }
  return map[level]
}

export function riskToLevel(score: number): RiskLevel {
  if (score >= 0.75) return 'CRITICAL'
  if (score >= 0.5) return 'HIGH'
  if (score >= 0.25) return 'MODERATE'
  return 'LOW'
}

export function riskBgClass(level: RiskLevel): string {
  const map: Record<RiskLevel, string> = {
    LOW: 'bg-green-500/20 text-green-400 border-green-500/30',
    MODERATE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  return map[level]
}

export function formatNumber(n: number, decimals = 1): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(decimals)
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

export function scoreToPercent(score: number): string {
  return `${(score * 100).toFixed(1)}%`
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
