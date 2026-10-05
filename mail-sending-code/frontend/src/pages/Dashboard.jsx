// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Send, CheckCircle, TrendingUp, AlertTriangle, MessageSquare,
         RefreshCw, Clock, Zap, XCircle, ArrowRight } from 'lucide-react'
import StatCard from '../components/StatCard'
import api from '../services/axios'
import toast from 'react-hot-toast'

const PIE_COLORS = ['#6366f1', '#f43f5e', '#f59e0b']

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [queueStats, setQueueStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [analyticsRes, queueRes] = await Promise.all([
        api.get('/logs/analytics?days=30'),
        api.get('/queue/status'),
      ])
      setAnalytics(analyticsRes.data)
      setQueueStats(queueRes.data)
    } catch (err) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const kpi = analytics?.kpi || {}
  const dailyStats = analytics?.dailyStats || []

  // Pie chart data
  const pieData = [
    { name: 'Delivered', value: parseInt(kpi.delivered) || 0 },
    { name: 'Failed',    value: parseInt(kpi.failed) || 0 },
    { name: 'Bounced',   value: parseInt(kpi.bounced) || 0 },
  ]

  const alerts = []
  if (parseFloat(kpi.bounceRate) > 5)
    alerts.push({ type: 'error', text: `High bounce rate: ${kpi.bounceRate}%` })
  if (parseFloat(kpi.openRate) < 15)
    alerts.push({ type: 'warning', text: `Low open rate: ${kpi.openRate}%` })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Sent"   value={Number(kpi.totalSent  ||0).toLocaleString()} icon={Send}                   color="brand"   />
        <StatCard title="Delivered"    value={Number(kpi.delivered  ||0).toLocaleString()} icon={CheckCircle}            color="emerald" />
        <StatCard title="Open Rate"    value={`${kpi.openRate||0}%`}                        icon={TrendingUp}             color="violet"  />
        <StatCard title="Bounce Rate"  value={`${kpi.bounceRate||0}%`}                      icon={AlertTriangle}          color="amber"   />
        <StatCard title="Complaints"   value={Number(kpi.complained ||0).toLocaleString()} icon={MessageSquare}          color="red"     />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
              ${a.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                                  : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {a.text}
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Emails Sent — Last 30 Days
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dailyStats} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:[&>line]:stroke-slate-800" />
              <XAxis dataKey="stat_date" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,.12)' }} />
              <Legend />
              <Line type="monotone" dataKey="emails_sent"      name="Sent"      stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="emails_delivered" name="Delivered" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="emails_bounced"   name="Bounced"   stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Delivery Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                   paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Queue widget */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Queue Status</h3>
            <Link to="/queue" className="text-xs text-brand-600 dark:text-brand-400 font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Waiting',   value: queueStats?.stats?.waiting   || 0, icon: Clock,    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
              { label: 'Active',    value: queueStats?.stats?.active     || 0, icon: Zap,      color: 'bg-blue-100  dark:bg-blue-900/30  text-blue-600  dark:text-blue-400' },
              { label: 'Failed',    value: queueStats?.stats?.failed     || 0, icon: XCircle,  color: 'bg-red-100   dark:bg-red-900/30   text-red-600   dark:text-red-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-white tabular-nums">{value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Create New Campaign', to: '/campaigns/create', color: 'btn-primary' },
              { label: 'View Bounce Reports', to: '/bounces',          color: 'btn-secondary' },
              { label: 'Manage Domains',      to: '/domains',          color: 'btn-secondary' },
              { label: 'Reputation Monitor',  to: '/reputation',       color: 'btn-secondary' },
            ].map(({ label, to, color }) => (
              <Link key={to} to={to} className={`${color} w-full justify-between`}>
                {label}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
