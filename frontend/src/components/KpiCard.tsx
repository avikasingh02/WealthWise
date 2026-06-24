interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'green' | 'red' | 'blue' | 'slate'
}

const colorMap = {
  green: 'text-green-600',
  red: 'text-red-500',
  blue: 'text-blue-600',
  slate: 'text-slate-700',
}

export default function KpiCard({ label, value, sub, color = 'slate' }: KpiCardProps) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}
