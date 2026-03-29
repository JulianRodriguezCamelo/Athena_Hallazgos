'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import Button from '@/components/ui/button'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.replace('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Error al iniciar sesión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#7B1F1F] flex-col justify-between p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-white/15 rounded-xl p-2.5">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">Hallazgos ERO</p>
              <p className="text-xs text-white/50 uppercase tracking-widest">
                Fiduprevisora
              </p>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Gestión integral de<br />eventos de riesgo
          </h2>
          <p className="text-white/60 text-base max-w-xs leading-relaxed">
            Plataforma centralizada para el seguimiento, análisis y control de
            hallazgos operacionales.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: 'Hallazgos', sub: 'centralizados' },
            { label: 'Roles', sub: 'diferenciados' },
            { label: 'Dashboard', sub: 'en tiempo real' },
          ].map((c) => (
            <div key={c.label} className="bg-white/10 rounded-xl p-4">
              <p className="text-white font-semibold text-sm">{c.label}</p>
              <p className="text-white/50 text-xs mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full bg-[#E07B39]/20" />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F8F5F5]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="bg-[#7B1F1F] rounded-lg p-1.5">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <p className="text-base font-bold text-[#7B1F1F]">Hallazgos ERO</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#E8E0E0] p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Bienvenido
            </h1>
            <p className="text-sm text-gray-500 mb-7">
              Ingresa tus credenciales para continuar
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="usuario@fiduprevisora.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-md border border-[#E8E0E0] bg-white px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#E07B39]/30 focus:border-[#E07B39]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="secondary"
                size="lg"
                loading={loading}
                className="w-full mt-2"
              >
                Iniciar sesión
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
