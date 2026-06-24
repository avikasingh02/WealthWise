import { useState } from 'react'
import { useQuery } from 'react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'
import { analyticsApi } from '../lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const chartStyle = {
  grid: 'rgba(255,255,255,0.04)',
  tick: { fill: '#475569', fontSize: 11 },
  tooltip: {
    contentStyle: { background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#f1f5f9', fontSize: 12 },
    itemStyle: { color: '#94a3b8' },
  },
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState(currentPeriod())

  const { data: cats } = useQuery(
    ['categories', period],
    () => analyticsApi.categories(period).then((r) => r.data),
    { staleTime: 5 * 60 * 1000 }
  )
  const { data: trends } = useQuery(
    ['trends', 12],
    () => analyticsApi.trends(12).then((r) => r.data),
    { staleTime: 5 * 60 * 1000 }
  )
  const { data: forecast } = useQuery(
    ['forecast'],
    () => analyticsApi.forecast(1).then((r) => r.data),
    { staleTime: 10 * 60 * 1000 }
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Analytics</h1>
          <p className="text-xs text-slate-600 mt-0.5">Deep-dive into your spending patterns</p>
        </div>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="input w-36 text-xs"
        />
      </div>

      {/* Category breakdown */}
      <div className="card">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-4">
          Spending breakdown — {period}
        </p>
        {cats?.breakdown?.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cats.breakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} horizontal={false} />
              <XAxis type="number" tick={chartStyle.tick} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="category" tick={chartStyle.tick} width={120} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={chartStyle.tooltip.contentStyle} itemStyle={chartStyle.tooltip.itemStyle} />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} name="Amount">
                {cats.breakdown.map((_: unknown, i: number) => (
                  <Bar key={i} dataKey="amount" fill={`hsl(${180 + i * 20}, 70%, 55%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-600 text-xs text-center py-10">No data for this period</p>
        )}
      </div>

      {/* 12-month trend */}
      <div className="card">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-4">12-month trend</p>
        {trends?.series?.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trends.series}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
              <XAxis dataKey="month" tick={chartStyle.tick} axisLine={false} tickLine={false} />
              <YAxis tick={chartStyle.tick} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={chartStyle.tooltip.contentStyle} itemStyle={chartStyle.tooltip.itemStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-600 text-xs text-center py-10">No trend data</p>
        )}
        {trends?.fastest_growing_category && (
          <p className="text-xs text-slate-600 mt-3">
            Fastest growing: <span className="text-amber-400 font-medium">{trends.fastest_growing_category}</span>
          </p>
        )}
      </div>

      {/* Forecast */}
      {forecast && (
        <div className="card">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-4">Next month forecast</p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-3xl font-mono font-semibold text-cyan-400">
              {fmt(forecast.overall.predicted)}
            </span>
            <span className="text-xs text-slate-600 font-mono uppercase">{forecast.overall.method}</span>
          </div>
          {forecast.by_category?.length > 0 && (
            <div className="space-y-2 border-t border-white/[0.06] pt-4">
              {forecast.by_category.slice(0, 6).map((c: any) => (
                <div key={c.category} className="flex justify-between text-xs">
                  <span className="text-slate-500">{c.category}</span>
                  <span className="font-mono text-slate-300">{fmt(c.predicted)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
