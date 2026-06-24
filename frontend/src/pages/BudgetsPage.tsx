import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { budgetApi } from '../lib/api'
import BudgetBar from '../components/BudgetBar'

function currentPeriod() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function BudgetsPage() {
  const qc = useQueryClient()
  const [period, setPeriod] = useState(currentPeriod())
  const [showForm, setShowForm] = useState(false)
  const [catId, setCatId] = useState('')
  const [limit, setLimit] = useState('')

  const { data: budgets = [] } = useQuery(
    ['budgets', period],
    () => budgetApi.list(period).then((r) => r.data),
    { staleTime: 60 * 1000 }
  )

  const createMut = useMutation(
    () => budgetApi.create({ category_id: catId, monthly_limit: Number(limit), period }),
    {
      onSuccess: () => {
        qc.invalidateQueries(['budgets', period])
        setShowForm(false)
        setCatId('')
        setLimit('')
      },
    }
  )

  const deleteMut = useMutation((id: string) => budgetApi.delete(id), {
    onSuccess: () => qc.invalidateQueries(['budgets', period]),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Budgets</h1>
        <div className="flex gap-3">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input w-40"
          />
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            + New budget
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="font-semibold text-slate-700 mb-4">Add budget</h3>
          <div className="space-y-3">
            <div>
              <label className="label">Category ID</label>
              <input
                className="input"
                placeholder="Category UUID"
                value={catId}
                onChange={(e) => setCatId(e.target.value)}
              />
              <p className="text-xs text-slate-400 mt-1">
                Find category IDs in the transactions list
              </p>
            </div>
            <div>
              <label className="label">Monthly limit (₹)</label>
              <input
                type="number"
                className="input"
                placeholder="10000"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                className="btn-primary"
                onClick={() => createMut.mutate()}
                disabled={!catId || !limit || createMut.isLoading}
              >
                {createMut.isLoading ? 'Saving…' : 'Save budget'}
              </button>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
            {createMut.isError && (
              <p className="text-red-500 text-sm">Failed to create budget. Check the category ID.</p>
            )}
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🎯</div>
          <p className="font-semibold text-slate-700">No budgets for {period}</p>
          <p className="text-slate-400 text-sm mt-1">Create a budget to track your spending</p>
        </div>
      ) : (
        <div className="card space-y-6">
          {budgets.map((b: any) => (
            <div key={b.id} className="relative">
              <BudgetBar
                categoryName={b.category_name || 'Unknown'}
                spent={Number(b.spent)}
                limit={Number(b.monthly_limit)}
                pctUsed={b.pct_used}
                status={b.status}
                period={period}
              />
              <button
                className="absolute top-0 right-0 text-xs text-slate-400 hover:text-red-500"
                onClick={() => deleteMut.mutate(b.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
