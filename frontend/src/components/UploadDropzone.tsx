import { useRef, useState, DragEvent } from 'react'
import { uploadApi } from '../lib/api'

interface UploadState {
  status: 'idle' | 'uploading' | 'polling' | 'done' | 'error'
  jobId?: string
  rowsInserted?: number
  error?: string
}

export default function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File) {
    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setState({ status: 'error', error: 'Only CSV and XLSX files are supported.' })
      return
    }
    setState({ status: 'uploading' })
    try {
      const { data } = await uploadApi.upload(file)
      const jobId: string = data.job_id
      setState({ status: 'polling', jobId })
      pollJob(jobId)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (detail?.code === 'DUPLICATE_FILE') {
        setState({ status: 'error', error: 'This file has already been uploaded.' })
      } else {
        setState({ status: 'error', error: 'Upload failed. Please try again.' })
      }
    }
  }

  function pollJob(jobId: string) {
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const { data } = await uploadApi.status(jobId)
        if (data.status === 'DONE') {
          clearInterval(interval)
          setState({ status: 'done', jobId, rowsInserted: data.rows_inserted })
        } else if (data.status === 'FAILED') {
          clearInterval(interval)
          setState({ status: 'error', error: data.error || 'Processing failed.' })
        } else if (attempts > 60) {
          clearInterval(interval)
          setState({ status: 'error', error: 'Processing timed out.' })
        }
      } catch {
        clearInterval(interval)
        setState({ status: 'error', error: 'Could not check job status.' })
      }
    }, 2000)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      className={`relative border rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
        dragging
          ? 'border-cyan-500/50 bg-cyan-500/5 shadow-glow-cyan'
          : 'border-dashed border-white/[0.1] hover:border-cyan-500/30 hover:bg-white/[0.02]'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => state.status === 'idle' || state.status === 'error' ? inputRef.current?.click() : null}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
      />

      {state.status === 'idle' && (
        <div className="space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">Drop your bank statement here</p>
            <p className="text-xs text-slate-600 mt-1">CSV or XLSX • up to 10 MB</p>
          </div>
          <p className="text-xs text-slate-700">
            Supported: HDFC, ICICI, Generic CSV
          </p>
        </div>
      )}

      {(state.status === 'uploading' || state.status === 'polling') && (
        <div className="space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-cyan-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-300">
            {state.status === 'uploading' ? 'Uploading…' : 'Processing transactions…'}
          </p>
          {state.status === 'polling' && (
            <p className="text-xs text-slate-600">Categorising & deduplicating rows</p>
          )}
        </div>
      )}

      {state.status === 'done' && (
        <div className="space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-400">
              {state.rowsInserted} transactions imported
            </p>
            <button
              className="text-xs text-slate-500 hover:text-cyan-400 mt-2 underline transition-colors"
              onClick={(e) => { e.stopPropagation(); setState({ status: 'idle' }) }}
            >
              Upload another file
            </button>
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <div className="space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-red-400">{state.error}</p>
            <button
              className="text-xs text-slate-500 hover:text-cyan-400 mt-2 underline transition-colors"
              onClick={(e) => { e.stopPropagation(); setState({ status: 'idle' }) }}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
