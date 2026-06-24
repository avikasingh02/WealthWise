import UploadDropzone from '../components/UploadDropzone'

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Upload Statement</h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload your bank statement in CSV or XLSX format. Transactions are automatically
          categorized and added to your dashboard.
        </p>
      </div>

      <UploadDropzone />

      <div className="card">
        <h3 className="font-semibold text-slate-700 mb-3">Supported formats</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <div>
              <strong>HDFC Bank</strong> — standard statement export (CSV)
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <div>
              <strong>ICICI Bank</strong> — account statement (CSV)
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">✓</span>
            <div>
              <strong>Generic CSV/XLSX</strong> — any file with date, amount, and description columns
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Re-uploading the same file is safe — duplicate transactions are automatically detected and skipped.
        </p>
      </div>
    </div>
  )
}
