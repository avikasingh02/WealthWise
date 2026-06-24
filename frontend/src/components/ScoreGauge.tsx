interface ScoreGaugeProps {
  score: number
  label?: string
  // legacy
  rating?: string
  breakdown?: Record<string, number>
}

function getColor(score: number) {
  if (score >= 75) return { stroke: '#22c55e', textClass: 'text-emerald-400', tier: 'Excellent', badgeClass: 'badge-green' }
  if (score >= 50) return { stroke: '#06b6d4', textClass: 'text-cyan-400',    tier: 'Good',      badgeClass: 'badge-blue' }
  if (score >= 25) return { stroke: '#f59e0b', textClass: 'text-amber-400',   tier: 'Fair',      badgeClass: 'badge-yellow' }
  return           { stroke: '#ef4444', textClass: 'text-red-400',             tier: 'Poor',      badgeClass: 'badge-red' }
}

export default function ScoreGauge({ score, label, breakdown }: ScoreGaugeProps) {
  const { stroke, textClass, tier, badgeClass } = getColor(score)
  const r = 52
  const circumference = Math.PI * r
  const filled = (score / 100) * circumference

  return (
    <div className="card hover-glow flex flex-col items-center py-6">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-4">
        {label ?? 'Financial Health Score'}
      </p>

      <div className="relative w-36 h-20">
        <svg viewBox="0 0 120 64" className="w-full h-full overflow-visible">
          <path
            d="M 8 60 A 52 52 0 0 1 112 60"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 8 60 A 52 52 0 0 1 112 60"
            fill="none"
            stroke={stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            style={{ filter: `drop-shadow(0 0 6px ${stroke}88)`, transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
          <span className={`text-3xl font-mono font-bold ${textClass}`}>{score}</span>
          <span className="text-[10px] text-slate-500 mt-0.5">/100</span>
        </div>
      </div>

      <span className={`mt-3 badge ${badgeClass}`}>{tier}</span>

      {breakdown && Object.keys(breakdown).length > 0 && (
        <div className="mt-4 w-full space-y-1.5 border-t border-white/[0.06] pt-4">
          {Object.entries(breakdown).map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
              <span className={`font-mono font-medium ${textClass}`}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
