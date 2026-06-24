import { useQuery } from 'react-query'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { analyticsApi } from '../lib/api'
import KpiCard from '../components/KpiCard'
import ScoreGauge from '../components/ScoreGauge'
import { useAuth } from '../store/auth'

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const period = currentPeriod()

  const { data: dash, isLoading: loadingDash } = useQuery(
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

  if (loadingDash) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Loading dashboard…
      </div>
    )
  }

  const isEmpty = !dash || (dash.income === 0 && dash.expenses === 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">{period} overview</p>
      </div>

      {isEmpty ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">📂</div>
          <p className="text-lg font-semibold text-slate-700">No data yet</p>
          <p className="text-slate-400 text-sm mt-2">Upload a bank statement to get started</p>
          <a href="/upload" className="btn-primary inline-block mt-4">Upload statement</a>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Income" value={fmt(dash.income)} color="green" />
            <KpiCard label="Expenses" value={fmt(dash.expenses)} color="red" />
            <KpiCard label="Savings" value={fmt(dash.savings)} color="blue" />
            <KpiCard
              label="Savings Rate"
              value={`${(dash.savings_rate * 100).toFixed(1)}%`}
              sub={dash.top_category ? `Top: ${dash.top_category}` : undefined}
              color={dash.savings_rate >= 0.2 ? 'green' : 'red'}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Category pie */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-600 mb-4">Spending by category</h3>
              {cats?.breakdown?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={cats.breakdown}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ category, pct }) => `${category} ${(pct * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {cats.breakdown.map((_: unknown, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-sm text-center py-10">No expense data</p>
              )}
            </div>

            {/* Trend line */}
            <div className="card lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-600 mb-4">Income vs Expenses (6m)</h3>
              {trends?.series?.length ? (
                <ResponsiveContainer width="100%" height={220}>
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
                <p className="text-slate-400 text-sm text-center py-10">No trend data</p>
              )}
            </div>
          </div>

          {/* Health score */}
          {health && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <ScoreGauge score={health.score} rating={health.rating} breakdown={health.breakdown} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
