// src/components/StatCard.jsx — Dashboard KPI card
import { TrendingUp, TrendingDown } from 'lucide-react'

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'brand', trend, trendLabel }) => {
  const colorMap = {
    brand:   'from-brand-500  to-brand-600  shadow-brand-500/20',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    amber:   'from-amber-500   to-amber-600   shadow-amber-500/20',
    red:     'from-red-500     to-red-600     shadow-red-500/20',
    violet:  'from-violet-500  to-violet-600  shadow-violet-500/20',
    sky:     'from-sky-500     to-sky-600     shadow-sky-500/20',
  }

  const isPositive = trend > 0
  const isNeutral  = trend === 0 || trend === undefined

  return (
    <div className="card p-5 flex flex-col gap-4 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1.5 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{value ?? '—'}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.brand} flex items-center justify-center shadow-md flex-shrink-0`}>
          {Icon && <Icon className="w-5 h-5 text-white" />}
        </div>
      </div>

      {!isNeutral && (
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{isPositive ? '+' : ''}{trend}%</span>
          {trendLabel && <span className="text-slate-400 font-normal">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}

export default StatCard
