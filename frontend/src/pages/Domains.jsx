// src/pages/Domains.jsx
import { useState, useEffect } from 'react'
import { Globe, Plus, Trash2, RefreshCw, Shield, Loader2 } from 'lucide-react'
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
  const [form, setForm] = useState({ domain: '', ipAddress: '' })
  const [deleting, setDeleting] = useState(null)

  const fetchDomains = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/domains')
      setDomains(data.domains || [])
    } catch { toast.error('Failed to load domains') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchDomains() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.domain) return
    setAdding(true)
    try {
      const { data } = await api.post('/domains/add', form)
      toast.success('Domain added!')
      setDomains((prev) => [...prev, data.domain])
      setForm({ domain: '', ipAddress: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add domain')
    } finally { setAdding(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this domain?')) return
    setDeleting(id)
    try {
      await api.delete(`/domains/${id}`)
      setDomains((prev) => prev.filter((d) => d.id !== id))
      toast.success('Domain removed')
    } catch { toast.error('Failed to remove domain') }
    finally { setDeleting(null) }
  }

  const handleStatus = async (id, status) => {
    try {
      await api.put(`/domains/${id}/status`, { status })
      setDomains((prev) => prev.map((d) => d.id === id ? { ...d, status } : d))
      toast.success(`Status updated to ${status}`)
    } catch { toast.error('Failed to update status') }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">Domains & IP Rotation</h2>
          <p className="page-subtitle">{domains.length} domain{domains.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button onClick={fetchDomains} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Add domain form */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add New Domain
        </h3>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="label">Domain Name</label>
            <input className="input" placeholder="mail.yourdomain.com"
              value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} required />
          </div>
          <div className="flex-1">
            <label className="label">IP Address (optional)</label>
            <input className="input" placeholder="192.168.1.10"
              value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={adding} className="btn-primary py-2.5">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Domain
            </button>
          </div>
        </form>
      </div>

      {/* Domain pool info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active',      value: domains.filter((d) => d.status === 'active').length,      color: 'text-emerald-600' },
          { label: 'Warming Up',  value: domains.filter((d) => d.status === 'warmup').length,      color: 'text-amber-600'  },
          { label: 'Blacklisted', value: domains.filter((d) => d.status === 'blacklisted').length, color: 'text-red-600'    },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <Shield className={`w-8 h-8 ${color}`} />
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Domains table */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <Globe className="w-10 h-10 mb-2 opacity-30" />
            <p>No domains configured yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Domain</th><th>IP Address</th><th>Status</th><th>Reputation</th><th>Sent Today</th><th>Limit</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <tr key={d.id}>
                    <td className="font-mono text-sm font-medium">{d.domain}</td>
                    <td className="text-slate-500 dark:text-slate-400 font-mono text-xs">{d.ip_address || '—'}</td>
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
                    <td className="min-w-[140px]">
                      <ReputationBar score={d.reputation_score || 0} />
                    </td>
                    <td className="tabular-nums">{d.emails_sent_today || 0}</td>
                    <td className="tabular-nums text-slate-500">{d.daily_limit || 500}</td>
                    <td>
                      <button onClick={() => handleDelete(d.id)} disabled={deleting === d.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                        {deleting === d.id
                          ? <RefreshCw className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
