interface BudgetBarProps {
  categoryName: string
  spent: number
  limit: number
  pctUsed: number
  status: 'OK' | 'WARN' | 'OVER'
  period: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const statusConfig = {
  OK:   { bar: 'from-cyan-500 to-cyan-400',     badge: 'badge-blue',   label: 'On track',         glow: 'rgba(6,182,212,0.4)' },
  WARN: { bar: 'from-amber-500 to-amber-400',   badge: 'badge-yellow', label: 'Approaching limit', glow: 'rgba(245,158,11,0.4)' },
  OVER: { bar: 'from-red-500 to-red-400',       badge: 'badge-red',    label: 'Over budget',       glow: 'rgba(239,68,68,0.4)' },
}

export default function BudgetBar({ categoryName, spent, limit, pctUsed, status }: BudgetBarProps) {
  const pct = Math.min(pctUsed * 100, 100)
  const { bar, badge, label, glow } = statusConfig[status]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">{categoryName}</span>
        <div className="flex items-center gap-2">
          <span className={`badge ${badge}`}>{label}</span>
          <span className="text-xs font-mono text-slate-500">
            {fmt(spent)} / {fmt(limit)}
          </span>
        </div>
      </div>

      <div className="relative h-1.5 w-full rounded-full bg-white/[0.05]">
        <div
          className={`absolute left-0 top-0 h-1.5 rounded-full bg-gradient-to-r ${bar} transition-all duration-700`}
          style={{
            width: `${pct}%`,
            boxShadow: pct > 0 ? `0 0 8px ${glow}` : 'none',
          }}
        />
      </div>

      <div className="flex justify-end">
        <span className="text-[10px] text-slate-600 font-mono">{Math.round(pct)}% used</span>
      </div>
    </div>
  )
}
