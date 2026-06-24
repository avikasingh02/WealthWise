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
    <div>
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-green-400 bg-green-50' : 'border-slate-200 hover:border-green-300 hover:bg-green-50/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
        />

        {state.status === 'idle' && (
          <>
            <div className="text-4xl mb-3">📤</div>
            <p className="font-semibold text-slate-700">Drop your bank statement here</p>
            <p className="text-sm text-slate-400 mt-1">CSV or XLSX • up to 10 MB</p>
          </>
        )}

        {state.status === 'uploading' && (
          <>
            <div className="text-4xl mb-3 animate-bounce">⬆️</div>
            <p className="font-semibold text-slate-700">Uploading…</p>
          </>
        )}

        {state.status === 'polling' && (
          <>
            <div className="text-4xl mb-3 animate-spin">⚙️</div>
            <p className="font-semibold text-slate-700">Processing transactions…</p>
            <p className="text-sm text-slate-400 mt-1">This may take a few seconds</p>
          </>
        )}

        {state.status === 'done' && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-green-700">
              {state.rowsInserted} transactions imported!
            </p>
            <p
              className="text-sm text-green-600 mt-2 underline"
              onClick={(e) => { e.stopPropagation(); setState({ status: 'idle' }) }}
            >
              Upload another file
            </p>
          </>
        )}

        {state.status === 'error' && (
          <>
            <div className="text-4xl mb-3">❌</div>
            <p className="font-semibold text-red-600">{state.error}</p>
            <p
              className="text-sm text-slate-500 mt-2 underline"
              onClick={(e) => { e.stopPropagation(); setState({ status: 'idle' }) }}
            >
              Try again
            </p>
          </>
        )}
      </div>
    </div>
  )
}
