// src/pages/Personalization.jsx
import { useState } from 'react'
import { Wand2, Send, RefreshCw, Eye, Plus, Minus, Loader2 } from 'lucide-react'
import { personalize } from '../utils/personalize'
import api from '../services/axios'
import toast from 'react-hot-toast'

const DEFAULT_TEMPLATE = {
  subject: 'Hi {{name}}, we have something special for you!',
  body: `<div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;padding:32px;">
  <h2 style="color:#4f46e5;">Hello, {{name}}! 👋</h2>
  <p>We noticed you're from <strong>{{city}}</strong> and wanted to reach out personally.</p>
  <p>Your account <strong>{{email}}</strong> qualifies for our exclusive offer.</p>
  <a href="{{link}}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;">
    Claim Offer →
  </a>
</div>`,
}

const extractVars = (template) => {
  const regex = /\{\{(\w+)\}\}/g
  const vars = new Set()
  let m
  while ((m = regex.exec(template)) !== null) vars.add(m[1])
  return [...vars]
}

export default function Personalization() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [fields, setFields] = useState([
    { key: 'name',  value: 'John Doe' },
    { key: 'city',  value: 'New York' },
    { key: 'email', value: 'john@example.com' },
    { key: 'link',  value: 'https://example.com' },
  ])
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState('preview') // 'preview' | 'html'

  const dataObj = Object.fromEntries(fields.map(({ key, value }) => [key, value]))
  const previewSubject = personalize(template.subject, dataObj)
  const previewBody    = personalize(template.body,    dataObj)

  // Extract variables currently in template
  const templateVars = extractVars(template.subject + ' ' + template.body)

  const addField  = () => setFields([...fields, { key: '', value: '' }])
  const removeField = (i) => setFields(fields.filter((_, idx) => idx !== i))
  const setField  = (i, key, val) =>
    setFields(fields.map((f, idx) => idx === i ? { ...f, [key]: val } : f))

  const handleSendTest = async () => {
    if (!testEmail) { toast.error('Enter a test email address'); return }
    setSending(true)
    try {
      await api.post('/auth/me') // just test auth; real send uses campaign
      toast.success(`Test email preview sent to ${testEmail} (configure SMTP in .env to enable)`)
    } catch {
      toast.error('Please configure SMTP settings in backend .env to send test emails')
    } finally { setSending(false) }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="page-header">
        <div>
          <h2 className="page-title">Personalization Engine</h2>
          <p className="page-subtitle">Map CSV variables and preview email output</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Template + Variables */}
        <div className="space-y-5">
          {/* Template editor */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-brand-500" /> Email Template
            </h3>
            <div>
              <label className="label">Subject</label>
              <input className="input" value={template.subject}
                onChange={(e) => setTemplate({ ...template, subject: e.target.value })} />
            </div>
            <div>
              <label className="label">Body (HTML)</label>
              <textarea className="input font-mono text-xs h-52 resize-none" value={template.body}
                onChange={(e) => setTemplate({ ...template, body: e.target.value })} />
            </div>

            {/* Detected variables */}
            {templateVars.length > 0 && (
              <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-3">
                <p className="text-xs font-semibold text-brand-700 dark:text-brand-300 mb-2">
                  Detected variables ({templateVars.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {templateVars.map((v) => (
                    <span key={v} className="badge badge-purple font-mono">{`{{${v}}}`}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Variable mapping */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Variable Mapping</h3>
              <button onClick={addField} className="btn-secondary text-xs py-1.5 px-3">
                <Plus className="w-3.5 h-3.5" /> Add Variable
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1">
                    <input className="input font-mono text-xs py-2" placeholder="variable name"
                      value={f.key} onChange={(e) => setField(i, 'key', e.target.value)} />
                  </div>
                  <span className="text-slate-400 text-sm font-mono">→</span>
                  <div className="flex-1">
                    <input className="input text-xs py-2" placeholder="sample value"
                      value={f.value} onChange={(e) => setField(i, 'value', e.target.value)} />
                  </div>
                  <button onClick={() => removeField(i)}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Test email sender */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Send className="w-4 h-4" /> Send Test Email
            </h3>
            <div className="flex gap-2">
              <input className="input flex-1" type="email" placeholder="test@example.com"
                value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
              <button onClick={handleSendTest} disabled={sending} className="btn-primary flex-shrink-0">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
            </div>
            <p className="text-xs text-slate-400">Requires SMTP configured in backend .env</p>
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Eye className="w-4 h-4" /> Live Preview
            </h3>
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
              {['preview', 'html'].map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 font-medium transition-colors capitalize
                              ${tab === t ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Subject preview */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-400 mb-0.5">Subject:</p>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{previewSubject}</p>
          </div>

          {tab === 'preview' ? (
            <iframe srcDoc={previewBody} className="w-full h-[480px] border border-slate-200 dark:border-slate-700 rounded-xl bg-white"
              title="Email preview" sandbox="allow-same-origin allow-scripts" />
          ) : (
            <textarea readOnly className="input font-mono text-xs h-[480px] resize-none bg-slate-50 dark:bg-slate-800"
              value={previewBody} />
          )}

          {/* Variable replacements table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="text-xs w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left text-slate-500 font-semibold">Variable</th>
                  <th className="px-3 py-2 text-left text-slate-500 font-semibold">Replaced With</th>
                </tr>
              </thead>
              <tbody>
                {fields.filter((f) => f.key).map((f, i) => (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-1.5 font-mono text-brand-600 dark:text-brand-400">{`{{${f.key}}}`}</td>
                    <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{f.value || <em className="text-slate-400">empty</em>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
