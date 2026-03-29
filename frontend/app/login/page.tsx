'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        'Error al iniciar sesión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-white/15 rounded-xl p-2.5">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">Hallazgos ERO</p>
              <p className="text-xs text-white/50 uppercase tracking-widest">Fiduprevisora</p>
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
        <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full bg-accent/20" />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="bg-primary rounded-lg p-1.5">
              <ShieldAlert className="w-5 h-5 text-primary-foreground" />
            </div>
            <p className="text-base font-bold text-primary">Hallazgos ERO</p>
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-8">
              <h1 className="text-2xl font-bold text-foreground mb-1">Bienvenido</h1>
              <p className="text-sm text-muted-foreground mb-7">
                Ingresa tus credenciales para continuar
              </p>

              {error && (
                <div className="mb-5 flex items-start gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@fiduprevisora.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
