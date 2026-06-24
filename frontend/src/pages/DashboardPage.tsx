import { useQuery } from 'react-query'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import { analyticsApi } from '../lib/api'
import KpiCard from '../components/KpiCard'
import ScoreGauge from '../components/ScoreGauge'
import { useAuth } from '../store/auth'
import { Link } from 'react-router-dom'

const CHART_COLORS = ['#06b6d4','#8b5cf6','#f59e0b','#ef4444','#22c55e','#ec4899','#14b8a6','#f97316']

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const chartStyle = {
  grid: 'rgba(255,255,255,0.04)',
  tick: { fill: '#475569', fontSize: 11 },
  tooltip: {
    contentStyle: { background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#f1f5f9', fontSize: 12 },
    itemStyle: { color: '#94a3b8' },
  },
}

export default function DashboardPage() {
  const { user } = useAuth()
  const period = currentPeriod()

  const { data: dash, isLoading } = useQuery(
    ['dashboard', period],
    () => analyticsApi.dashboard(period).then((r) => r.data),
    { staleTime: 5 * 60 * 1000 }
  )
  const { data: cats } = useQuery(
    ['categories', period],
    () => analyticsApi.categories(period).then((r) => r.data),
    { staleTime: 5 * 60 * 1000 }
  )
  const { data: trends } = useQuery(
    ['trends', 6],
    () => analyticsApi.trends(6).then((r) => r.data),
    { staleTime: 5 * 60 * 1000 }
  )
  const { data: health } = useQuery(
    ['health-score', period],
    () => analyticsApi.healthScore(period).then((r) => r.data),
    { staleTime: 10 * 60 * 1000 }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="w-5 h-5 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          Loading dashboard…
        </div>
      </div>
    )
  }

  const isEmpty = !dash || (dash.income === 0 && dash.expenses === 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">
            {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-xs text-slate-600 mt-0.5 font-mono">{period}</p>
        </div>
        <span className="badge-blue">Live</span>
      </div>

      {isEmpty ? (
        <div className="card text-center py-20">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-800 border border-white/[0.06] flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400">No transaction data yet</p>
          <p className="text-xs text-slate-600 mt-1">Upload a bank statement to populate your dashboard</p>
          <Link to="/upload" className="btn-primary inline-flex mt-5">
            Upload statement →
          </Link>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard title="Income" value={fmt(dash.income)} accent="emerald" />
            <KpiCard title="Expenses" value={fmt(dash.expenses)} accent="amber" />
            <KpiCard title="Savings" value={fmt(dash.savings)} accent="cyan" />
            <KpiCard
              title="Savings Rate"
              value={`${(dash.savings_rate * 100).toFixed(1)}%`}
              sub={dash.top_category ? `Top: ${dash.top_category}` : undefined}
              accent={dash.savings_rate >= 0.2 ? 'emerald' : 'violet'}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Donut */}
            <div className="card">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-4">Spending breakdown</p>
              {cats?.breakdown?.length ? (
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={cats.breakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      {cats.breakdown.map((_: unknown, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => fmt(v)}
                      contentStyle={chartStyle.tooltip.contentStyle}
                      itemStyle={chartStyle.tooltip.itemStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-600 text-xs text-center py-10">No expense data</p>
              )}
            </div>

            {/* Trend line */}
            <div className="card lg:col-span-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-4">Income vs Expenses — 6 months</p>
              {trends?.series?.length ? (
                <ResponsiveContainer width="100%" height={210}>
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
            </div>
          </div>

          {/* Health score */}
          {health && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <ScoreGauge score={health.score} rating={health.rating} breakdown={health.breakdown} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
