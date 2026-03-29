'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Eye, EyeOff, AlertCircle, Lock, Mail } from 'lucide-react'
import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState<string | null>(null)

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.replace('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Credenciales inválidas'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-30px) translateX(15px); }
          66% { transform: translateY(15px) translateX(-10px); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(20px) translateX(-20px); }
          66% { transform: translateY(-25px) translateX(10px); }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-40px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -400% center; }
          100% { background-position: 400% center; }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); opacity: 0.6; }
          70%  { transform: scale(1.05); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
        @keyframes grid-move {
          0%   { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes scan-line {
          0%   { top: -5%; }
          100% { top: 105%; }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin-arc {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        .orb1 { animation: float1 8s ease-in-out infinite; }
        .orb2 { animation: float2 11s ease-in-out infinite; }
        .orb3 { animation: float3 6s ease-in-out infinite; }

        .hero-text {
          animation: fadeInLeft 0.8s ease-out 0.2s both;
        }
        .hero-sub {
          animation: fadeInLeft 0.8s ease-out 0.4s both;
        }
        .hero-cards {
          animation: fadeInLeft 0.8s ease-out 0.6s both;
        }
        .login-card {
          animation: card-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }

        .orange-gradient-text {
          background: linear-gradient(135deg, #f97316 0%, #fb923c 40%, #fbbf24 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }

        .btn-primary {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%);
          background-size: 200% auto;
          transition: background-position 0.4s ease, transform 0.15s ease, box-shadow 0.3s ease;
          box-shadow: 0 4px 24px rgba(249, 115, 22, 0.35);
        }
        .btn-primary:hover:not(:disabled) {
          background-position: right center;
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(249, 115, 22, 0.55);
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%);
          pointer-events: none;
        }
        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .input-dark {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #f1f5f9;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          outline: none;
        }
        .input-dark::placeholder {
          color: rgba(255,255,255,0.25);
        }
        .input-dark:focus {
          border-color: rgba(249, 115, 22, 0.7);
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
          background: rgba(255,255,255,0.07);
        }

        .stat-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          transition: border-color 0.3s ease, background 0.3s ease;
        }
        .stat-card:hover {
          border-color: rgba(249, 115, 22, 0.3);
          background: rgba(249, 115, 22, 0.07);
        }

        .glass-card {
          background: rgba(15, 15, 25, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow:
            0 0 0 1px rgba(249, 115, 22, 0.08),
            0 32px 80px rgba(0, 0, 0, 0.6),
            inset 0 1px 0 rgba(255, 255, 255, 0.07);
        }

        .ring-animation {
          animation: pulse-ring 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .spin-arc {
          animation: spin-arc 3s linear infinite;
        }
        .glow-pulse {
          animation: glow-pulse 2.5s ease-in-out infinite;
        }

        .scan-line {
          animation: scan-line 6s linear infinite;
        }

        .grid-bg {
          background-image:
            linear-gradient(rgba(249,115,22,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: grid-move 8s linear infinite;
        }

        .left-divider {
          width: 3px;
          height: 100%;
          background: linear-gradient(to bottom, transparent, rgba(249,115,22,0.6), transparent);
        }

        .loading-dots span {
          display: inline-block;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: white;
          margin: 0 2px;
          animation: bounce-dot 1.2s ease-in-out infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        className="min-h-screen flex relative overflow-hidden"
        style={{ background: '#080810' }}
      >
        {/* Animated grid background */}
        <div className="grid-bg absolute inset-0 pointer-events-none" />

        {/* Scan line effect */}
        <div
          className="scan-line absolute left-0 right-0 h-px pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.15), transparent)',
            zIndex: 1,
          }}
        />

        {/* Floating orbs */}
        <div
          className="orb1 absolute pointer-events-none"
          style={{
            width: 500, height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(234,88,12,0.18) 0%, transparent 70%)',
            top: '-15%', left: '-10%',
            filter: 'blur(8px)',
          }}
        />
        <div
          className="orb2 absolute pointer-events-none"
          style={{
            width: 400, height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251,146,60,0.12) 0%, transparent 70%)',
            bottom: '-10%', right: '40%',
            filter: 'blur(8px)',
          }}
        />
        <div
          className="orb3 absolute pointer-events-none"
          style={{
            width: 300, height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)',
            top: '40%', right: '5%',
            filter: 'blur(12px)',
          }}
        />

        {/* ── LEFT PANEL ── */}
        <div
          className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 relative overflow-hidden"
          style={{
            borderRight: '1px solid rgba(249,115,22,0.12)',
            background: 'linear-gradient(135deg, rgba(15,10,5,0.95) 0%, rgba(8,8,16,0.95) 100%)',
          }}
        >
          {/* Top: logo */}
          <div className="relative z-10 hero-text">
            <div className="flex items-center gap-3 mb-14">
              <div
                className="relative"
                style={{
                  background: 'linear-gradient(135deg, #ea580c, #f97316)',
                  borderRadius: 14,
                  padding: 10,
                  boxShadow: '0 0 24px rgba(249,115,22,0.4)',
                }}
              >
                {/* Pulse ring */}
                <div
                  className="ring-animation absolute inset-0"
                  style={{
                    border: '1px solid rgba(249,115,22,0.6)',
                    borderRadius: 14,
                  }}
                />
                <ShieldAlert className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-white tracking-wide">Athena</p>
                <p className="text-xs uppercase tracking-widest" style={{ color: 'rgba(249,115,22,0.7)' }}>
                  Fiduprevisora
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div
                className="text-xs uppercase tracking-widest mb-3 font-semibold"
                style={{ color: 'rgba(249,115,22,0.6)' }}
              >
                Plataforma de Gestión
              </div>
              <h2 className="text-5xl font-bold leading-tight text-white mb-1">
                Gestión integral
              </h2>
              <h2 className="text-5xl font-bold leading-tight">
                <span className="orange-gradient-text">de riesgo</span>
              </h2>
            </div>

            <p className="hero-sub text-base leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Plataforma centralizada para el seguimiento, análisis y control de
              hallazgos operacionales.
            </p>
          </div>

          {/* Center: decorative node */}
          <div className="relative z-10 flex items-center justify-center py-8">
            <div className="relative" style={{ width: 160, height: 160 }}>
              {/* Rotating arcs */}
              <svg
                className="spin-arc absolute inset-0"
                width="160" height="160"
                viewBox="0 0 160 160"
              >
                <circle
                  cx="80" cy="80" r="70"
                  fill="none"
                  stroke="url(#arc-grad)"
                  strokeWidth="1"
                  strokeDasharray="120 320"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="arc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(249,115,22,0)" />
                    <stop offset="100%" stopColor="rgba(249,115,22,0.8)" />
                  </linearGradient>
                </defs>
              </svg>
              <svg
                className="absolute inset-0"
                style={{ animation: 'spin-arc 5s linear infinite reverse' }}
                width="160" height="160"
                viewBox="0 0 160 160"
              >
                <circle
                  cx="80" cy="80" r="55"
                  fill="none"
                  stroke="rgba(251,146,60,0.25)"
                  strokeWidth="1"
                  strokeDasharray="60 280"
                  strokeLinecap="round"
                />
              </svg>
              {/* Core */}
              <div
                className="absolute glow-pulse"
                style={{
                  inset: '25%',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(249,115,22,0.9) 0%, rgba(234,88,12,0.6) 50%, transparent 100%)',
                  boxShadow: '0 0 40px rgba(249,115,22,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldAlert style={{ color: 'white', width: 28, height: 28 }} />
              </div>
            </div>
          </div>

          {/* Bottom: stat cards */}
          <div className="relative z-10 hero-cards grid grid-cols-3 gap-3">
            {[
              { label: 'Hallazgos', sub: 'Centralizados', dot: '#f97316' },
              { label: 'Roles', sub: 'Diferenciados', dot: '#fb923c' },
              { label: 'Dashboard', sub: 'Tiempo real', dot: '#fbbf24' },
            ].map((c) => (
              <div key={c.label} className="stat-card rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />
                </div>
                <p className="text-white font-semibold text-sm">{c.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Vertical orange line accent */}
          <div
            className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(249,115,22,0.4) 30%, rgba(249,115,22,0.4) 70%, transparent 100%)' }}
          />
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          className="flex-1 flex flex-col items-center justify-center p-8 relative"
          style={{ zIndex: 2 }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)', borderRadius: 10, padding: 8, boxShadow: '0 0 18px rgba(249,115,22,0.4)' }}
            >
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <p className="text-base font-bold text-white">Athena</p>
          </div>

          <div className="login-card glass-card w-full max-w-sm rounded-2xl p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-1">Bienvenido</h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Ingresa tus credenciales para continuar
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                className="mb-6 flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#fca5a5',
                  animation: 'fadeInUp 0.3s ease-out',
                }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#f87171' }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(249,115,22,0.8)' }}
                >
                  <Mail style={{ width: 12, height: 12 }} />
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="usuario@fiduprevisora.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                  required
                  autoComplete="email"
                  className="input-dark w-full h-11 px-4 rounded-xl text-sm"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(249,115,22,0.8)' }}
                >
                  <Lock style={{ width: 12, height: 12 }} />
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                    required
                    autoComplete="current-password"
                    className="input-dark w-full h-11 px-4 pr-11 rounded-xl text-sm"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: focused === 'password' ? 'rgba(249,115,22,0.8)' : 'rgba(255,255,255,0.3)' }}
                  >
                    {showPass
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full h-11 rounded-xl text-sm font-semibold text-white mt-2"
              >
                {loading
                  ? (
                    <span className="loading-dots flex items-center justify-center gap-1">
                      <span /><span /><span />
                    </span>
                  )
                  : 'Iniciar sesión'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs"
              style={{
                background: 'rgba(249,115,22,0.07)',
                border: '1px solid rgba(249,115,22,0.15)',
                color: 'rgba(249,115,22,0.7)',
              }}
            >
              <ShieldAlert style={{ width: 11, height: 11 }} />
              By Dirección de Ciberseguridad Fiduprevisora
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
