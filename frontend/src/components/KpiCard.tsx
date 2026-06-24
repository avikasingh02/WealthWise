interface KpiCardProps {
  title: string
  value: string
  sub?: string
  trend?: number
  accent?: 'cyan' | 'violet' | 'emerald' | 'amber'
  icon?: React.ReactNode
  // legacy aliases
  label?: string
  color?: string
}

const accentMap = {
  cyan:    { border: 'border-t-cyan-500/50',    text: 'text-cyan-400',    glow: '0 -1px 0 0 rgba(6,182,212,0.4)' },
  violet:  { border: 'border-t-violet-500/50',  text: 'text-violet-400',  glow: '0 -1px 0 0 rgba(139,92,246,0.4)' },
  emerald: { border: 'border-t-emerald-500/50', text: 'text-emerald-400', glow: '0 -1px 0 0 rgba(16,185,129,0.4)' },
  amber:   { border: 'border-t-amber-500/50',   text: 'text-amber-400',   glow: '0 -1px 0 0 rgba(245,158,11,0.4)' },
}

export default function KpiCard({ title, label, value, sub, trend, accent = 'cyan', icon }: KpiCardProps) {
  const { border, text, glow } = accentMap[accent]
  const heading = title ?? label ?? ''

  return (
    <div
      className={`card hover-glow border-t-2 ${border}`}
      style={{ boxShadow: `0 4px 24px rgba(0,0,0,0.4), ${glow}` }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{heading}</p>
        {icon && <span className={`${text} opacity-60`}>{icon}</span>}
      </div>

      <p className={`text-2xl font-mono font-semibold tracking-tight ${text}`}>{value}</p>

      {(sub || trend !== undefined) && (
        <div className="flex items-center gap-2 mt-2">
          {trend !== undefined && (
            <span className={trend >= 0 ? 'badge-green' : 'badge-red'}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {sub && <p className="text-xs text-slate-600">{sub}</p>}
        </div>
      )}
    </div>
  )
}
