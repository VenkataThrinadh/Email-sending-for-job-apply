// src/pages/Campaigns.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RefreshCw, Trash2, Eye, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { campaignService } from '../services/campaignService'
import toast from 'react-hot-toast'

const statusBadge = (status) => {
  const map = {
    draft:    { cls: 'badge-gray',   icon: Clock },
    queued:   { cls: 'badge-blue',   icon: Send },
    sending:  { cls: 'badge-yellow', icon: RefreshCw },
    sent:     { cls: 'badge-green',  icon: CheckCircle },
    failed:   { cls: 'badge-red',    icon: XCircle },
    paused:   { cls: 'badge-yellow', icon: AlertCircle },
  }
  const { cls, icon: Icon } = map[status] || { cls: 'badge-gray', icon: Clock }
  return (
    <span className={cls}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </span>
  )
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const { data } = await campaignService.getCampaigns()
      setCampaigns(data.campaigns || [])
    } catch {
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCampaigns() }, [])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return
    setDeleting(id)
    try {
      await campaignService.deleteCampaign(id)
      toast.success('Campaign deleted')
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">Campaigns</h2>
          <p className="page-subtitle">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchCampaigns} className="btn-secondary">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/campaigns/create" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Campaign
          </Link>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Send className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-sm mb-4">Create your first email campaign to get started</p>
            <Link to="/campaigns/create" className="btn-primary">
              <Plus className="w-4 h-4" /> Create Campaign
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Recipients</th>
                  <th>Sent</th>
                  <th>Failed</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</td>
                    <td className="max-w-xs truncate text-slate-600 dark:text-slate-400">{c.subject}</td>
                    <td>{statusBadge(c.status)}</td>
                    <td className="tabular-nums">{(c.total_recipients || 0).toLocaleString()}</td>
                    <td className="tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                      {(c.sent_count || 0).toLocaleString()}
                    </td>
                    <td className="tabular-nums text-red-500 dark:text-red-400 font-medium">
                      {(c.failed_count || 0).toLocaleString()}
                    </td>
                    <td className="text-slate-500 dark:text-slate-400 text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link to={`/campaigns/${c.id}`} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-brand-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-colors">
                          {deleting === c.id
                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
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
