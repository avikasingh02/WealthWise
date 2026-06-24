import UploadDropzone from '../components/UploadDropzone'

const supported = [
  { bank: 'HDFC Bank', detail: 'Standard statement export (CSV)' },
  { bank: 'ICICI Bank', detail: 'Account statement (CSV)' },
  { bank: 'Generic CSV / XLSX', detail: 'Any file with date, amount, and description columns' },
]

export default function UploadPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Upload Statement</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Transactions are automatically categorised, deduplicated, and added to your dashboard.
        </p>
      </div>

      <UploadDropzone />

      <div className="card">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-4">Supported formats</p>
        <div className="space-y-3">
          {supported.map(({ bank, detail }) => (
            <div key={bank} className="flex items-start gap-3">
              <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mt-0.5 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-300">{bank}</p>
                <p className="text-[10px] text-slate-600">{detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-700 mt-4 border-t border-white/[0.05] pt-3">
          Re-uploading the same file is safe — duplicates are automatically skipped.
        </p>
      </div>
    </div>
  )
}
