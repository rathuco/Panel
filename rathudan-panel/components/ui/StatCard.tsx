import { clsx } from 'clsx'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  color?: 'red' | 'green' | 'blue' | 'amber' | 'purple'
}

const colorMap = {
  red: 'text-brand-red bg-brand-red/10',
  green: 'text-emerald-400 bg-emerald-400/10',
  blue: 'text-blue-400 bg-blue-400/10',
  amber: 'text-amber-400 bg-amber-400/10',
  purple: 'text-purple-400 bg-purple-400/10',
}

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'red' }: StatCardProps) {
  return (
    <div className="card-hover animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('p-2.5 rounded-xl', colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span
            className={clsx(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              trend.value >= 0
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            )}
          >
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-brand-white tracking-tight">{value}</p>
        <p className="text-sm font-medium text-brand-white-muted mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-brand-white-dim mt-0.5">{subtitle}</p>
        )}
        {trend && (
          <p className="text-xs text-brand-white-dim mt-1">{trend.label}</p>
        )}
      </div>
    </div>
  )
}
