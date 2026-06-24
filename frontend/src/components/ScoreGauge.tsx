interface ScoreGaugeProps {
  score: number
  rating: string
  breakdown: Record<string, number>
}

function scoreColor(score: number) {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#eab308'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

export default function ScoreGauge({ score, rating, breakdown }: ScoreGaugeProps) {
  const color = scoreColor(score)
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="card flex flex-col items-center">
      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">
        Financial Health Score
      </h3>

      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-800">{score}</span>
          <span className="text-xs text-slate-500">{rating}</span>
        </div>
      </div>

      <div className="mt-4 w-full space-y-2">
        {Object.entries(breakdown).map(([key, val]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-slate-600 capitalize">{key.replace(/_/g, ' ')}</span>
            <span className="font-medium text-slate-800">{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
