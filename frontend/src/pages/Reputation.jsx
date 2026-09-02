// src/pages/Reputation.jsx
import { useState, useEffect } from 'react'
import {
  BarChart3, RefreshCw, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Shield
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PieChart, Pie, Cell, Legend
} from 'recharts'
import api from '../services/axios'
import toast from 'react-hot-toast'

const INBOX_COLORS = ['#6366f1', '#f43f5e']

const ScoreGauge = ({ score }) => {
  const data = [{ name: 'Score', value: score, fill: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#f43f5e' }]
  const color = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Fair' : 'Poor'
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <RadialBarChart width={160} height={160} cx={80} cy={80}
          innerRadius={50} outerRadius={75} data={data} startAngle={180} endAngle={0}>
          <RadialBar minAngle={15} dataKey="value" cornerRadius={10} background={{ fill: '#e2e8f0' }} />
        </RadialBarChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
          <p className={`text-3xl font-bold ${color}`}>{score}</p>
          <p className="text-xs text-slate-500">/100</p>
        </div>
      </div>
      <p className={`text-sm font-semibold mt-1 ${color}`}>{label}</p>
      <p className="text-xs text-slate-400">Sender Score</p>
    </div>
  )
}

export default function Reputation() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: rep } = await api.get('/logs/reputation')
      setData(rep)
    } catch { toast.error('Failed to load reputation data') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  const trend    = data?.complaintTrend || []
  const domains  = data?.domainScores   || []
  const alerts   = data?.alerts         || []
  const stats    = data?.stats          || {}
  const inbox    = data?.inboxRate      ?? 90
  const spam     = data?.spamRate       ?? 10
  const score    = data?.senderScore    ?? 0

  const inboxPie = [
    { name: 'Inbox',   value: inbox },
    { name: 'Spam',    value: spam  },
  ]

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">Reputation Monitoring</h2>
          <p className="page-subtitle">Track your sender health and deliverability metrics</p>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
              ${a.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {a.message}
            </div>
          ))}
        </div>
      )}

      {/* Top row: Gauge + stats + inbox ratio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Gauge */}
        <div className="card p-5 flex items-center justify-center">
          <ScoreGauge score={score} />
        </div>

        {/* Key stats */}
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Lifetime Stats</h3>
          {[
            { label: 'Total Sent',    value: Number(stats.total_sent  ||0).toLocaleString(), icon: BarChart3,    color: 'text-brand-500' },
            { label: 'Delivered',     value: Number(stats.delivered   ||0).toLocaleString(), icon: CheckCircle,  color: 'text-emerald-500'},
            { label: 'Bounce Rate',   value: `${stats.bounceRate||0}%`,                       icon: TrendingDown, color: 'text-red-500'   },
            { label: 'Complaint Rate',value: `${stats.complaintRate||0}%`,                    icon: AlertTriangle,color: 'text-orange-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
              </div>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</span>
            </div>
          ))}
        </div>

        {/* Inbox vs Spam pie */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Inbox vs Spam</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={inboxPie} cx="50%" cy="50%" outerRadius={65} dataKey="value" paddingAngle={3}>
                {inboxPie.map((_, i) => <Cell key={i} fill={INBOX_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} formatter={(v) => `${v}%`} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-1 text-sm font-semibold">
            <span className="text-brand-600">{inbox}% Inbox</span>
            <span className="text-red-500">{spam}% Spam</span>
          </div>
        </div>
      </div>

      {/* Complaint + Bounce trend area chart */}
      {trend.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Complaints & Bounces — Last 30 Days
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
              <Legend />
              <Area type="monotone" dataKey="complaints" name="Complaints" stroke="#f43f5e" fill="url(#cGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="bounces"    name="Bounces"    stroke="#f59e0b" fill="url(#bGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Domain reputation table */}
      {domains.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-500" /> Domain Reputation
          </h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Domain</th><th>Status</th><th>Score</th><th>Health</th></tr>
              </thead>
              <tbody>
                {domains.map((d) => {
                  const pct = d.reputation_score || 0
                  const bar = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                  return (
                    <tr key={d.domain}>
                      <td className="font-mono text-sm">{d.domain}</td>
                      <td>
                        <span className={`badge ${d.status === 'active' ? 'badge-green' : d.status === 'warmup' ? 'badge-yellow' : 'badge-red'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="font-semibold tabular-nums">{pct}/100</td>
                      <td className="min-w-[160px]">
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
