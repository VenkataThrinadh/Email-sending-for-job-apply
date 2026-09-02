// src/pages/CreateCampaign.jsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Send, Calendar, Loader2, X, FileText, Eye } from 'lucide-react'
import api from '../services/axios'
import toast from 'react-hot-toast'
import { personalize } from '../utils/personalize'

const SAMPLE_TEMPLATE = `<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px;background:#ffffff;">
  <h2 style="color:#4f46e5;margin-bottom:16px;">Hi {{name}} 👋</h2>
  <p style="color:#374151;line-height:1.6;">
    We have an exciting offer just for you, <strong>{{name}}</strong>!
    Click the button below to learn more.
  </p>
  <a href="{{link}}" style="display:inline-block;margin-top:24px;padding:12px 28px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
    Learn More →
  </a>
  <p style="margin-top:32px;color:#9ca3af;font-size:12px;">
    You are receiving this because you subscribed to our list.<br/>
    <a href="#">Unsubscribe</a>
  </p>
</div>`

export default function CreateCampaign() {
  const navigate = useNavigate()
  const fileRef = useRef()
  const [form, setForm] = useState({
    name: '',
    subject: 'Hello {{name}}, special offer inside!',
    body: SAMPLE_TEMPLATE,
    scheduledAt: '',
  })
  const [csvFile, setCsvFile] = useState(null)
  const [csvPreview, setCsvPreview] = useState([])
  const [previewing, setPreviewing] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const handleCSV = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCsvFile(file)
    // Preview first 5 rows
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').slice(0, 6)
      const headers = lines[0]?.split(',').map((h) => h.trim())
      const rows = lines.slice(1).filter(Boolean).map((l) =>
        Object.fromEntries(l.split(',').map((v, i) => [headers[i], v.trim()]))
      )
      setCsvPreview(rows)
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!csvFile) { toast.error('Please upload a CSV file with recipients.'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('subject', form.subject)
      fd.append('body', form.body)
      if (form.scheduledAt) fd.append('scheduledAt', form.scheduledAt)
      fd.append('csv', csvFile)

      const { data } = await api.post('/campaign/create', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(data.message)
      navigate('/campaigns')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  // Live preview using first CSV row
  const previewData = csvPreview[0] || { name: 'John', email: 'john@example.com', link: '#' }
  const previewBody = personalize(form.body, previewData)
  const previewSubject = personalize(form.subject, previewData)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="page-header">
        <div>
          <h2 className="page-title">Create Campaign</h2>
          <p className="page-subtitle">Configure and launch your email campaign</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div className="space-y-5">
          {/* Campaign Name */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Campaign Details</h3>
            <div>
              <label className="label">Campaign Name</label>
              <input className="input" placeholder="e.g. Summer Sale 2024" value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="label">Subject Line</label>
              <input className="input" placeholder="Hi {{name}}, special offer!" value={form.subject} onChange={set('subject')} required />
              <p className="mt-1 text-xs text-slate-400">Use {'{{name}}'} for personalization tags</p>
            </div>
            <div>
              <label className="label">Schedule (optional)</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="datetime-local" className="input pl-10" value={form.scheduledAt} onChange={set('scheduledAt')} />
              </div>
              <p className="mt-1 text-xs text-slate-400">Leave empty to send immediately</p>
            </div>
          </div>

          {/* CSV Upload */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recipients (CSV)</h3>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-all"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {csvFile ? csvFile.name : 'Click to upload CSV'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Required columns: email, name (+ any custom variables)</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />

            {/* Download sample CSV */}
            <a
              href="data:text/csv;charset=utf-8,email,name,link%0Ajohn@example.com,John,https://example.com%0Ajane@example.com,Jane,https://example.com"
              download="sample_recipients.csv"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <FileText className="w-3 h-3" /> Download sample CSV
            </a>

            {/* CSV preview rows */}
            {csvPreview.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="text-xs w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      {Object.keys(csvPreview[0]).map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-slate-500 dark:text-slate-400 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.slice(0, 4).map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: HTML Editor + Preview */}
        <div className="space-y-5">
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Body (HTML)</h3>
              <button type="button" onClick={() => setPreviewing(!previewing)}
                className="btn-secondary text-xs py-1.5 px-3">
                <Eye className="w-3.5 h-3.5" />
                {previewing ? 'Edit' : 'Preview'}
              </button>
            </div>

            {previewing ? (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs text-slate-500">
                  <span className="font-semibold">Subject:</span> {previewSubject}
                </div>
                <div className="p-1 bg-white min-h-[320px]">
                  <iframe
                    srcDoc={previewBody}
                    className="w-full h-80 border-0"
                    title="Email preview"
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              </div>
            ) : (
              <textarea
                className="input font-mono text-xs h-80 resize-none"
                value={form.body}
                onChange={set('body')}
                placeholder="Enter HTML email content..."
                required
              />
            )}
            <p className="text-xs text-slate-400">
              Use {'{{name}}'}, {'{{email}}'}, or any CSV column as a variable
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/campaigns')} className="btn-secondary flex-1 justify-center">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                : <><Send className="w-4 h-4" /> {form.scheduledAt ? 'Schedule' : 'Send Now'}</>
              }
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
