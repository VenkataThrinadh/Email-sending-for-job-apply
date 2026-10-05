// src/components/TopBar.jsx
import { Menu, Sun, Moon, Bell } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const TopBar = ({ onMenuClick, title }) => {
  const { isDark, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 sm:px-6
                       bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm
                       border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="text-base font-semibold text-slate-800 dark:text-slate-200">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell (UI only) */}
        <button className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark
            ? <Sun className="w-5 h-5 text-amber-400" />
            : <Moon className="w-5 h-5 text-slate-600" />
          }
        </button>
      </div>
    </header>
  )
}

export default TopBar
