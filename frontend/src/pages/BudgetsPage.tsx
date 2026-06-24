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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Budgets</h1>
          <p className="text-xs text-slate-600 mt-0.5">Set and track monthly spending limits</p>
        </div>
        <div className="flex gap-2">
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="input w-36 text-xs"
          />
          <button className="btn-primary text-xs" onClick={() => setShowForm(!showForm)}>
            + New budget
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card border border-cyan-500/20">
          <p className="text-sm font-medium text-slate-300 mb-4">Add budget</p>
          <div className="space-y-4">
            <div>
              <label className="label">Category ID</label>
              <input
                className="input"
                placeholder="Category UUID"
                value={catId}
                onChange={(e) => setCatId(e.target.value)}
              />
              <p className="text-[10px] text-slate-600 mt-1">Find category IDs in the transactions list</p>
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
            <div className="flex gap-2">
              <button
                className="btn-primary text-xs"
                onClick={() => createMut.mutate()}
                disabled={!catId || !limit || createMut.isLoading}
              >
                {createMut.isLoading ? 'Saving…' : 'Save budget'}
              </button>
              <button className="btn-secondary text-xs" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
            {createMut.isError && (
              <p className="text-xs text-red-400">Failed to create budget. Check the category ID.</p>
            )}
          </div>
        </div>
      )}

      {budgets.length === 0 ? (
        <div className="card text-center py-16">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-space-800 border border-white/[0.06] flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-400">No budgets for {period}</p>
          <p className="text-xs text-slate-600 mt-1">Create a budget to track your spending</p>
        </div>
      ) : (
        <div className="card space-y-5">
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
                className="absolute top-0 right-0 text-[10px] text-slate-600 hover:text-red-400 transition-colors"
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
