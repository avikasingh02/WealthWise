interface BudgetBarProps {
  categoryName: string
  spent: number
  limit: number
  pctUsed: number
  status: 'OK' | 'WARN' | 'OVER'
  period: string
}

const statusColor = {
  OK: 'bg-green-500',
  WARN: 'bg-yellow-400',
  OVER: 'bg-red-500',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

export default function BudgetBar({ categoryName, spent, limit, pctUsed, status }: BudgetBarProps) {
  const pct = Math.min(pctUsed * 100, 100)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700">{categoryName}</span>
        <span className="text-slate-500">
          {fmt(spent)} / {fmt(limit)}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${statusColor[status]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{Math.round(pctUsed * 100)}% used</span>
        <span className={status === 'OVER' ? 'text-red-500 font-medium' : status === 'WARN' ? 'text-yellow-600' : ''}>
          {status === 'OVER' ? 'Over budget!' : status === 'WARN' ? 'Approaching limit' : 'On track'}
        </span>
      </div>
    </div>
  )
}
