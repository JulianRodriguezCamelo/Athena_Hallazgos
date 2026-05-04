'use client'

import { RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useDirectivoData } from '@/hooks/useDirectivoData'
import { CustomizableDashboard } from '@/components/organisms/dashboard/CustomizableDashboard'

export default function DirectivoDashboard() {
  const { user } = useAuth()
  const {
    metricas, porEstado, porEstadoPlan, porEstadoAccion,
    hallazgos, hPage, setHPage,
    loading, refreshing, reload,
  } = useDirectivoData()

  const total = metricas?.total ?? 0
  const cerradas = metricas?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
      Cargando…
    </div>
  )

  const directivoCtx = {
    directivo: {
      metricas,
      porEstado,
      porEstadoPlan,
      porEstadoAccion,
      hallazgos,
      hPage,
      setHPage,
      cumplimiento,
      total,
      reload,
    },
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mi Panel de Control</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bienvenido, {user?.nombre} · <span className="text-primary">{user?.dependencia ?? user?.vicepresidencia ?? 'Directivo'}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto" onClick={() => reload(true)} disabled={refreshing}>
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      <CustomizableDashboard role="directivo" ctx={directivoCtx} />
    </div>
  )
}
