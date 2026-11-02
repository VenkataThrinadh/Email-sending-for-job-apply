// src/pages/Domains.jsx — Multi-Sender & Domain Rotation Management
import { useState, useEffect } from 'react'
import { Globe, Plus, Trash2, RefreshCw, Shield, Loader2, Mail, Key, Edit2, Check, X } from 'lucide-react'
import api from '../services/axios'
import toast from 'react-hot-toast'

const statusBadge = (s) => ({
  active:      'badge-green',
  warmup:      'badge-yellow',
  inactive:    'badge-gray',
  blacklisted: 'badge-red',
}[s] || 'badge-gray')

const ReputationBar = ({ score }) => {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-7 text-right">{score}</span>
    </div>
  )
}

export default function Domains() {
  const [domains, setDomains] = useState([])
  const [loading, setLoading]   = useState(true)
  const [adding,  setAdding]    = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [editingLimitId, setEditingLimitId] = useState(null)
  const [editingLimitVal, setEditingLimitVal] = useState(80)

  const [form, setForm] = useState({
    domain: '',
    smtpUser: '',
    smtpPass: '',
    dailyLimit: 80,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587
  })
  const [deleting, setDeleting] = useState(null)

  const fetchDomains = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/domains')
      setDomains(data.domains || [])
    } catch { toast.error('Failed to load sender accounts') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchDomains() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.domain) return
    setAdding(true)
    try {
      const payload = {
        domain: form.domain.trim(),
        smtpUser: form.smtpUser ? form.smtpUser.trim() : (form.domain.includes('@') ? form.domain.trim() : null),
        smtpPass: form.smtpPass ? form.smtpPass.trim() : null,
        dailyLimit: parseInt(form.dailyLimit) || 80,
        smtpHost: form.smtpHost || 'smtp.gmail.com',
        smtpPort: parseInt(form.smtpPort) || 587
      }
      const { data } = await api.post('/domains/add', payload)
      toast.success(data.message || 'Sender account added!')
      setDomains((prev) => [...prev, data.domain])
      setForm({
        domain: '',
        smtpUser: '',
        smtpPass: '',
        dailyLimit: 80,
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587
      })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add sender')
    } finally { setAdding(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this sender account?')) return
    setDeleting(id)
    try {
      await api.delete(`/domains/${id}`)
      setDomains((prev) => prev.filter((d) => d.id !== id))
      toast.success('Sender account removed')
    } catch { toast.error('Failed to remove account') }
    finally { setDeleting(null) }
  }

  const handleStatus = async (id, status) => {
    try {
      await api.put(`/domains/${id}/status`, { status })
      setDomains((prev) => prev.map((d) => d.id === id ? { ...d, status } : d))
      toast.success(`Status updated to ${status}`)
    } catch { toast.error('Failed to update status') }
  }

  const saveDailyLimit = async (id) => {
    try {
      await api.put(`/domains/${id}/limit`, { dailyLimit: editingLimitVal })
      setDomains((prev) => prev.map((d) => d.id === id ? { ...d, daily_limit: editingLimitVal } : d))
      setEditingLimitId(null)
      toast.success('Daily limit updated')
    } catch { toast.error('Failed to update limit') }
  }

  const totalCapacity = domains
    .filter(d => d.status === 'active')
    .reduce((acc, d) => acc + (d.daily_limit || 80), 0)

  const totalSentToday = domains
    .reduce((acc, d) => acc + (d.emails_sent_today || 0), 0)

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">Sender Accounts & Rotation</h2>
          <p className="page-subtitle">
            {domains.length} sender accounts · Safe capacity: {totalCapacity} emails/day ({totalSentToday} sent today)
          </p>
        </div>
        <button onClick={fetchDomains} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Add sender account form */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-500" /> Add Sender Account / Gmail
          </h3>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
          >
            {showAdvanced ? 'Hide SMTP Settings' : 'Custom SMTP Host/Port'}
          </button>
        </div>

        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Gmail / Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="youraccount@gmail.com"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Google App Password (16 chars)</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  className="input pl-9 font-mono"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={form.smtpPass}
                  onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Leave empty to use default .env credentials</p>
            </div>

            <div>
              <label className="label">Safe Daily Limit</label>
              <input
                type="number"
                min="1"
                max="500"
                className="input"
                placeholder="80"
                value={form.dailyLimit}
                onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })}
              />
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">Recommended: 60-80 for Gmail</p>
            </div>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="label">SMTP Host</label>
                <input
                  className="input"
                  placeholder="smtp.gmail.com"
                  value={form.smtpHost}
                  onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                />
              </div>
              <div>
                <label className="label">SMTP Port</label>
                <input
                  type="number"
                  className="input"
                  placeholder="587"
                  value={form.smtpPort}
                  onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button type="submit" disabled={adding} className="btn-primary">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Sender Account
            </button>
          </div>
        </form>
      </div>

      {/* Pool status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Senders', value: domains.filter((d) => d.status === 'active').length, color: 'text-emerald-600' },
          { label: 'Total Capacity', value: `${totalCapacity} emails/day`, color: 'text-brand-600' },
          { label: 'Today Usage', value: `${totalSentToday} sent today`, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <Shield className={`w-8 h-8 ${color}`} />
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Senders table */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 text-slate-400 p-6 text-center">
            <Mail className="w-10 h-10 mb-2 opacity-30" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No sender accounts added yet</p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Add multiple Gmail accounts above to enable automatic rotation and avoid hitting the 500 email quota!
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sender / Email</th>
                  <th>Status</th>
                  <th>Quota Used Today</th>
                  <th>Safe Limit</th>
                  <th>Health Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => {
                  const sent = d.emails_sent_today || 0
                  const limit = d.daily_limit || 80
                  const pct = Math.min(100, Math.round((sent / limit) * 100))
                  const isFull = sent >= limit

                  return (
                    <tr key={d.id}>
                      <td className="font-mono text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span>{d.domain}</span>
                          {d.has_password && (
                            <span className="badge badge-purple text-[10px] py-0 px-1.5" title="Custom App Password set">
                              Custom Auth
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <select
                          value={d.status}
                          onChange={(e) => handleStatus(d.id, e.target.value)}
                          className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          {['active','warmup','inactive','blacklisted'].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="min-w-[150px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span className={`font-semibold ${isFull ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                              {sent} / {limit}
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-brand-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="tabular-nums">
                        {editingLimitId === d.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="1000"
                              value={editingLimitVal}
                              onChange={(e) => setEditingLimitVal(Number(e.target.value))}
                              className="w-16 px-1.5 py-0.5 text-xs rounded border border-brand-500 bg-white dark:bg-slate-800"
                            />
                            <button onClick={() => saveDailyLimit(d.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingLimitId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{limit}</span>
                            <button
                              onClick={() => { setEditingLimitId(d.id); setEditingLimitVal(limit); }}
                              className="text-slate-400 hover:text-brand-600 p-0.5 rounded"
                              title="Edit daily limit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="min-w-[120px]">
                        <ReputationBar score={d.reputation_score || 100} />
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(d.id)}
                          disabled={deleting === d.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete account"
                        >
                          {deleting === d.id
                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
