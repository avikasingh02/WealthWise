import { useState } from 'react'
import { useQuery } from 'react-query'
import { transactionsApi } from '../lib/api'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)

const PAGE_SIZE = 50

export default function TransactionsPage() {
  const [offset, setOffset] = useState(0)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [category, setCategory] = useState('')

  const { data, isLoading } = useQuery(
    ['transactions', offset, from, to, category],
    () =>
      transactionsApi
        .list({ from: from || undefined, to: to || undefined, category: category || undefined, limit: PAGE_SIZE, offset })
        .then((r) => r.data),
    { keepPreviousData: true }
  )

  const total = data?.total ?? 0
  const items = data?.items ?? []

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Transactions</h1>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => { setFrom(e.target.value); setOffset(0) }} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => { setTo(e.target.value); setOffset(0) }} />
          </div>
          <div>
            <label className="label">Category</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Food & Dining"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setOffset(0) }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Date</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Merchant</th>
              <th className="text-left px-4 py-3 text-slate-500 font-medium">Category</th>
              <th className="text-right px-4 py-3 text-slate-500 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-400">Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-400">No transactions found</td>
              </tr>
            ) : (
              items.map((t: any) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{t.txn_date}</td>
                  <td className="px-4 py-3 text-slate-800 max-w-xs truncate">{t.merchant_norm || t.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                      {t.category_name || 'Uncategorized'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${t.direction === 'credit' ? 'text-green-600' : 'text-slate-800'}`}>
                    {t.direction === 'credit' ? '+' : ''}{fmt(Number(t.amount))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                className="btn-secondary text-xs py-1 px-3"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </button>
              <button
                className="btn-secondary text-xs py-1 px-3"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
