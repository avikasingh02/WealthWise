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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Transactions</h1>
        <p className="text-xs text-slate-600 mt-0.5">{total > 0 ? `${total} records` : 'No data yet'}</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="label">From</label>
            <input type="date" className="input w-36 text-xs" value={from}
              onChange={(e) => { setFrom(e.target.value); setOffset(0) }} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input w-36 text-xs" value={to}
              onChange={(e) => { setTo(e.target.value); setOffset(0) }} />
          </div>
          <div>
            <label className="label">Category</label>
            <input type="text" className="input w-44 text-xs" placeholder="e.g. Food & Dining"
              value={category} onChange={(e) => { setCategory(e.target.value); setOffset(0) }} />
          </div>
          {(from || to || category) && (
            <div className="self-end">
              <button
                className="btn-ghost text-xs"
                onClick={() => { setFrom(''); setTo(''); setCategory(''); setOffset(0) }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="text-left px-4 py-3 text-[10px] font-medium text-slate-600 uppercase tracking-widest">Date</th>
              <th className="text-left px-4 py-3 text-[10px] font-medium text-slate-600 uppercase tracking-widest">Merchant</th>
              <th className="text-left px-4 py-3 text-[10px] font-medium text-slate-600 uppercase tracking-widest">Category</th>
              <th className="text-right px-4 py-3 text-[10px] font-medium text-slate-600 uppercase tracking-widest">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-600 text-xs">
                  <svg className="w-5 h-5 animate-spin text-cyan-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Loading transactions…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-600 text-xs">No transactions found</td>
              </tr>
            ) : (
              items.map((t: any) => (
                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{t.txn_date}</td>
                  <td className="px-4 py-3 text-xs text-slate-300 max-w-xs truncate">
                    {t.merchant_norm || t.description || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-blue text-[10px]">
                      {t.category_name || 'Uncategorized'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-xs font-medium whitespace-nowrap ${
                    t.direction === 'credit' ? 'text-emerald-400' : 'text-slate-300'
                  }`}>
                    {t.direction === 'credit' ? '+' : ''}{fmt(Number(t.amount))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
            <span className="text-[10px] text-slate-600 font-mono">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs py-1 px-3" disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                ← Prev
              </button>
              <button className="btn-secondary text-xs py-1 px-3" disabled={offset + PAGE_SIZE >= total}
                onClick={() => setOffset(offset + PAGE_SIZE)}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
