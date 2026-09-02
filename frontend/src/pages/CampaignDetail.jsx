// src/pages/CampaignDetail.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Send, CheckCircle, XCircle,
  Clock, AlertCircle, Users, Mail, Calendar, TrendingUp
} from 'lucide-react'
import api from '../services/axios'
import toast from 'react-hot-toast'

const statusBadge = (status) => {
  const map = {
    draft:       { cls: 'badge-gray',   icon: Clock },
    queued:      { cls: 'badge-blue',   icon: Send },
    sending:     { cls: 'badge-yellow', icon: RefreshCw },
    sent:        { cls: 'badge-green',  icon: CheckCircle },
    failed:      { cls: 'badge-red',    icon: XCircle },
    paused:      { cls: 'badge-yellow', icon: AlertCircle },
    // recipient statuses
    pending:     { cls: 'badge-yellow', icon: Clock },
    bounced:     { cls: 'badge-red',    icon: XCircle },
    complained:  { cls: 'badge-red',    icon: AlertCircle },
    unsubscribed:{ cls: 'badge-gray',   icon: XCircle },
  }
  const { cls, icon: Icon } = map[status] || { cls: 'badge-gray', icon: Clock }
  return (
    <span className={cls}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </span>
  )
}

const StatBox = ({ label, value, color, icon: Icon }) => (
  <div className="card p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  </div>
)

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')

  const fetchCampaign = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/campaign/${id}`)
      setCampaign(data.campaign)
      setRecipients(data.recipients || [])
    } catch (err) {
      toast.error('Campaign not found')
      navigate('/campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCampaign() }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!campaign) return null

  // Delivery rate
  const total     = campaign.total_recipients || 1
  const deliverPct = Math.round((campaign.sent_count / total) * 100)
  const failPct    = Math.round((campaign.failed_count / total) * 100)
  const openPct    = Math.round(((campaign.open_count || 0) / total) * 100)

  // Filter recipients
  const filtered = filterStatus === 'all'
    ? recipients
    : recipients.filter((r) => r.status === filterStatus)

  const recipientStatuses = ['all', 'pending', 'sent', 'failed', 'bounced', 'complained', 'unsubscribed']

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back + Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/campaigns')}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h2 className="page-title">{campaign.name}</h2>
            <p className="page-subtitle">{campaign.subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {statusBadge(campaign.status)}
          <button onClick={fetchCampaign} className="btn-secondary">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Total Recipients" value={(campaign.total_recipients || 0).toLocaleString()} color="bg-brand-600"   icon={Users}       />
        <StatBox label="Sent"             value={(campaign.sent_count     || 0).toLocaleString()} color="bg-emerald-500" icon={CheckCircle}  />
        <StatBox label="Failed"           value={(campaign.failed_count   || 0).toLocaleString()} color="bg-red-500"     icon={XCircle}      />
        <StatBox label="Opens"            value={(campaign.open_count     || 0).toLocaleString()} color="bg-violet-500"  icon={TrendingUp}   />
      </div>

      {/* Progress bars */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Delivery Progress</h3>

        {[
          { label: 'Delivered', pct: deliverPct, color: 'bg-emerald-500' },
          { label: 'Failed',    pct: failPct,    color: 'bg-red-500'     },
          { label: 'Opened',    pct: openPct,    color: 'bg-violet-500'  },
        ].map(({ label, pct, color }) => (
          <div key={label}>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>{label}</span>
              <span className="font-semibold tabular-nums">{pct}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Campaign metadata */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Campaign Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {[
            { icon: Mail,     label: 'Subject',      value: campaign.subject },
            { icon: Calendar, label: 'Created',       value: new Date(campaign.created_at).toLocaleString() },
            { icon: Calendar, label: 'Scheduled For', value: campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString() : 'Immediately' },
            { icon: Calendar, label: 'Sent At',       value: campaign.sent_at ? new Date(campaign.sent_at).toLocaleString() : '—' },
            { icon: Users,    label: 'Campaign ID',   value: `#${campaign.id}` },
            { icon: TrendingUp, label: 'Open Rate',   value: `${openPct}%` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email body preview */}
      {campaign.body && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Email Body Preview</h3>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white">
            <iframe
              srcDoc={campaign.body}
              className="w-full h-72 border-0"
              title="Email body"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* Recipients table */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Recipients ({recipients.length})
          </h3>
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1">
            {recipientStatuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize
                  ${filterStatus === s
                    ? 'bg-brand-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <Users className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No recipients with status "{filterStatus}"</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-sm">{r.email}</td>
                    <td className="text-slate-600 dark:text-slate-400">{r.name || '—'}</td>
                    <td>{statusBadge(r.status)}</td>
                    <td className="text-xs text-slate-400">
                      {r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}
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
