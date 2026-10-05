// src/pages/Bounces.jsx
import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, Ban, Trash2, Plus, Loader2 } from 'lucide-react'
import api from '../services/axios'
import toast from 'react-hot-toast'

const bounceBadge = (type) => {
  if (type === 'hard') return <span className="badge badge-red">Hard Bounce</span>
  if (type === 'soft') return <span className="badge badge-yellow">Soft Bounce</span>
  return <span className="badge badge-gray">None</span>
}

export default function Bounces() {
  const [bounces, setBounces]         = useState([])
  const [suppression, setSuppression] = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('bounces')
  const [newEmail, setNewEmail]       = useState('')
  const [newReason, setNewReason]     = useState('manual')
  const [adding, setAdding]           = useState(false)
  const [removing, setRemoving]       = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [b, s] = await Promise.all([
        api.get('/logs/bounces?limit=100'),
        api.get('/logs/suppression'),
      ])
      setBounces(b.data.bounces || [])
      setSuppression(s.data.list || [])
    } catch { toast.error('Failed to load bounce data') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleAddSuppression = async (e) => {
    e.preventDefault()
    if (!newEmail) return
    setAdding(true)
    try {
      await api.post('/logs/suppression', { email: newEmail, reason: newReason })
      toast.success('Email added to suppression list')
      setNewEmail('')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add')
    } finally { setAdding(false) }
  }

  const handleRemove = async (email) => {
    setRemoving(email)
    try {
      await api.delete(`/logs/suppression/${encodeURIComponent(email)}`)
      setSuppression((prev) => prev.filter((s) => s.email !== email))
      toast.success('Removed from suppression list')
    } catch { toast.error('Failed to remove') }
    finally { setRemoving(null) }
  }

  const tabs = ['bounces', 'suppression']

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">Bounce & Complaint Handling</h2>
          <p className="page-subtitle">
            {bounces.length} bounce events · {suppression.length} suppressed emails
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Hard Bounces',   value: bounces.filter((b) => b.bounce_type === 'hard').length,   color: 'text-red-500'    },
          { label: 'Soft Bounces',   value: bounces.filter((b) => b.bounce_type === 'soft').length,   color: 'text-amber-500'  },
          { label: 'Complaints',     value: bounces.filter((b) => b.status === 'complained').length,   color: 'text-orange-500' },
          { label: 'Suppressed',     value: suppression.length,                                        color: 'text-slate-500'  },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all
                        ${tab === t ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {t === 'bounces' ? `Bounce Events (${bounces.length})` : `Suppression List (${suppression.length})`}
          </button>
        ))}
      </div>

      {/* Bounce events table */}
      {tab === 'bounces' && (
        <div className="card">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : bounces.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No bounce events recorded</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Email</th><th>Type</th><th>Status</th><th>Reason</th><th>Campaign</th><th>Timestamp</th></tr>
                </thead>
                <tbody>
                  {bounces.map((b) => (
                    <tr key={b.id}>
                      <td className="font-mono text-sm">{b.email}</td>
                      <td>{bounceBadge(b.bounce_type)}</td>
                      <td>
                        {b.status === 'complained'
                          ? <span className="badge badge-red">Complaint</span>
                          : <span className="badge badge-yellow">Bounced</span>}
                      </td>
                      <td className="text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        {b.complaint_reason || '—'}
                      </td>
                      <td className="text-xs text-slate-500">{b.campaign_name || '—'}</td>
                      <td className="text-xs text-slate-400">{new Date(b.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Suppression list */}
      {tab === 'suppression' && (
        <div className="space-y-4">
          {/* Add to suppression */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Ban className="w-4 h-4" /> Add to Suppression List
            </h3>
            <form onSubmit={handleAddSuppression} className="flex flex-col sm:flex-row gap-3">
              <input className="input flex-1" type="email" placeholder="email@example.com"
                value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              <select className="input sm:w-44" value={newReason} onChange={(e) => setNewReason(e.target.value)}>
                <option value="manual">Manual</option>
                <option value="hard_bounce">Hard Bounce</option>
                <option value="soft_bounce">Soft Bounce</option>
                <option value="complaint">Complaint</option>
                <option value="unsubscribe">Unsubscribe</option>
              </select>
              <button type="submit" disabled={adding} className="btn-primary flex-shrink-0">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
            </form>
          </div>

          <div className="card">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
              </div>
            ) : suppression.length === 0 ? (
              <p className="text-center py-12 text-slate-400">Suppression list is empty</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Email</th><th>Reason</th><th>Added</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {suppression.map((s) => (
                      <tr key={s.id}>
                        <td className="font-mono text-sm">{s.email}</td>
                        <td>
                          <span className={`badge ${s.reason === 'hard_bounce' ? 'badge-red' : s.reason === 'complaint' ? 'badge-red' : 'badge-yellow'}`}>
                            {s.reason}
                          </span>
                        </td>
                        <td className="text-xs text-slate-400">{new Date(s.added_at).toLocaleString()}</td>
                        <td>
                          <button onClick={() => handleRemove(s.email)} disabled={removing === s.email}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                            {removing === s.email
                              ? <Loader2 className="w-4 h-4 animate-spin" />
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
      )}
    </div>
  )
}
