// src/pages/Register.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Register() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    const res = await register(form.name, form.email, form.password)
    if (res.success) {
      toast.success('Account created! Welcome to EmailPro.')
      navigate('/')
    } else {
      toast.error(res.message)
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-xl shadow-brand-500/30 mb-4">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="text-slate-400 mt-1 text-sm">Start managing your email campaigns</p>
        </div>

        <form onSubmit={handleSubmit} className="card-glass p-8 space-y-4">
          {[
            { key: 'name',     icon: User,  type: 'text',     label: 'Full Name',     placeholder: 'John Doe' },
            { key: 'email',    icon: Mail,  type: 'email',    label: 'Email address', placeholder: 'you@example.com' },
          ].map(({ key, icon: Icon, type, label, placeholder }) => (
            <div key={key}>
              <label className="label text-slate-300">{label}</label>
              <div className="relative">
                <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={type} className="input pl-10 bg-slate-800/60 border-slate-700 text-white placeholder-slate-500"
                  placeholder={placeholder} value={form[key]} onChange={set(key)} required />
              </div>
            </div>
          ))}

          {['password', 'confirm'].map((key) => (
            <div key={key}>
              <label className="label text-slate-300">{key === 'password' ? 'Password' : 'Confirm Password'}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type={showPass ? 'text' : 'password'}
                  className="input pl-10 pr-10 bg-slate-800/60 border-slate-700 text-white placeholder-slate-500"
                  placeholder="••••••••" value={form[key]} onChange={set(key)} required />
                {key === 'password' && (
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </button>

          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
