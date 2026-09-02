// src/pages/Queue.jsx
import { useState, useEffect } from 'react'
import { RefreshCw, Play, Pause, RotateCcw, Zap, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import api from '../services/axios'
import toast from 'react-hot-toast'

const statusBadge = (s) => {
  const m = {
    pending:  { cls: 'badge-yellow', icon: Clock },
    sent:     { cls: 'badge-green',  icon: CheckCircle },
    failed:   { cls: 'badge-red',    icon: XCircle },
    active:   { cls: 'badge-blue',   icon: Zap },
    waiting:  { cls: 'badge-yellow', icon: Clock },
  }
  const { cls, icon: Icon } = m[s] || { cls: 'badge-gray', icon: Clock }
  return <span className={cls}><Icon className="w-3 h-3 mr-1" />{s}</span>
}

export default function Queue() {
  const [stats, setStats] = useState(null)
  const [jobs, setJobs]   = useState([])
  const [rate, setRate]   = useState(10)
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [s, j] = await Promise.all([
        api.get('/queue/status'),
        api.get('/queue/jobs?type=all'),
      ])
      setStats(s.data.stats)
      setPaused(s.data.stats?.isPaused || false)
      setJobs([...s.data.recentJobs, ...j.data.jobs].slice(0, 60))
    } catch { toast.error('Failed to load queue data') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const action = async (label, fn) => {
    setActionLoading(label)
    try { await fn(); toast.success(`${label} successful`); await fetchData() }
    catch { toast.error(`${label} failed`) }
    finally { setActionLoading('') }
  }

  const handleRetry  = () => action('Retry failed',  () => api.post('/queue/retry'))
  const handlePause  = () => action('Pause queue',   () => api.post('/queue/pause'))
  const handleResume = () => action('Resume queue',  () => api.post('/queue/resume'))
  const handleFlush  = async () => {
    if (!window.confirm('Flush all jobs from queue? This cannot be undone.')) return
    action('Flush queue', () => api.delete('/queue/flush'))
  }

  const statBoxes = [
    { label: 'Waiting',   value: stats?.waiting   ?? '—', color: 'text-amber-500',  bg: 'bg-amber-50  dark:bg-amber-900/20'  },
    { label: 'Active',    value: stats?.active     ?? '—', color: 'text-blue-500',   bg: 'bg-blue-50   dark:bg-blue-900/20'   },
    { label: 'Completed', value: stats?.completed  ?? '—', color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-900/20'},
    { label: 'Failed',    value: stats?.failed     ?? '—', color: 'text-red-500',    bg: 'bg-red-50    dark:bg-red-900/20'    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Queue Management</h2>
          <p className="page-subtitle">
            {paused
              ? <span className="text-amber-600 font-semibold">⏸ Queue is paused</span>
              : <span className="text-emerald-600 font-semibold">▶ Queue is running</span>}
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statBoxes.map(({ label, value, color, bg }) => (
          <div key={label} className={`card p-4 flex flex-col items-center gap-1 ${bg}`}>
            <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Queue Controls</h3>
        <div className="flex flex-wrap gap-3">
          {paused ? (
            <button onClick={handleResume} disabled={!!actionLoading} className="btn-success">
              {actionLoading === 'Resume queue' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Resume Queue
            </button>
          ) : (
            <button onClick={handlePause} disabled={!!actionLoading} className="btn-secondary text-amber-600 dark:text-amber-400">
              {actionLoading === 'Pause queue' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
              Pause Queue
            </button>
          )}
          <button onClick={handleRetry} disabled={!!actionLoading} className="btn-secondary">
            {actionLoading === 'Retry failed' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Retry Failed
          </button>
          <button onClick={handleFlush} disabled={!!actionLoading} className="btn-danger">
            <Trash2 className="w-4 h-4" /> Flush Queue
          </button>
        </div>

        {/* Rate slider */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">Rate Limit</label>
            <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{rate} emails/min</span>
          </div>
          <input type="range" min="1" max="100" value={rate} onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-brand-600 cursor-pointer" />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>1/min</span><span>50/min</span><span>100/min</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ℹ️ Runtime rate changes require worker restart. Update EMAILS_PER_MINUTE in .env to persist.
          </p>
        </div>
      </div>

      {/* Jobs table */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Jobs ({jobs.length})</h3>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-center text-slate-400 py-12">No jobs in queue</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Email</th><th>Campaign</th><th>Status</th><th>Sent At</th></tr>
              </thead>
              <tbody>
                {jobs.map((j, i) => (
                  <tr key={j.id || i}>
                    <td className="font-medium">{j.email}</td>
                    <td className="text-slate-500 dark:text-slate-400">{j.campaign_name || j.campaignId || '—'}</td>
                    <td>{statusBadge(j.bullState || j.status)}</td>
                    <td className="text-xs text-slate-400">{j.sent_at ? new Date(j.sent_at).toLocaleString() : '—'}</td>
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
