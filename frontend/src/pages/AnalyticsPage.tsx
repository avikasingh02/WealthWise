import { useState } from 'react'
import { useQuery } from 'react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { analyticsApi } from '../lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="input w-40"
        />
      </div>

      {/* Category breakdown bar */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-600 mb-4">
          Spending breakdown — {period}
        </h3>
        {cats?.breakdown?.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cats.breakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="amount" fill="#22c55e" radius={[0, 4, 4, 0]} name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-400 text-center py-10">No data for this period</p>
        )}
      </div>

      {/* 12-month trend */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-600 mb-4">12-month trend</h3>
        {trends?.series?.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trends.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-400 text-center py-10">No trend data</p>
        )}
        {trends?.fastest_growing_category && (
          <p className="text-xs text-slate-400 mt-2">
            Fastest growing: <strong>{trends.fastest_growing_category}</strong>
          </p>
        )}
      </div>

      {/* Forecast */}
      {forecast && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-600 mb-4">Next month forecast</h3>
          <p className="text-2xl font-bold text-slate-800 mb-1">
            {fmt(forecast.overall.predicted)}
          </p>
          <p className="text-xs text-slate-400 mb-4">
            Method: {forecast.overall.method}
          </p>
          {forecast.by_category?.length > 0 && (
            <div className="space-y-2">
              {forecast.by_category.slice(0, 6).map((c: any) => (
                <div key={c.category} className="flex justify-between text-sm">
                  <span className="text-slate-600">{c.category}</span>
                  <span className="font-medium">{fmt(c.predicted)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
