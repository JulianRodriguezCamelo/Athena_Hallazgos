'use client'

import { usePathname } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import AdminDashboard from './AdminDashboard'
import DirectivoDashboard from './DirectivoDashboard'
import GestorDashboard from './GestorDashboard'
import ProfesionalDashboard from './ProfesionalDashboard'
import DashboardShell from '@/components/layout/DashboardShell'
import { PageLoader } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/templates/PageHeader'
import { CustomizableDashboard } from '@/components/organisms/dashboard/CustomizableDashboard'
import { useDashboardData } from '@/hooks/useDashboardData'
import { CHART_COLORS_HEX } from '@/types'

export default function DashboardPage() {
  const pathname = usePathname()
  const { isVice, isDirectivo, isGestor, isProfesional, isAdmin } = useAuth()

  const { metrics, porEstado, porDependencia, porResponsable, timeline, porEstadoPlan, uploads, loading, isRefreshing, reload } = useDashboardData()

  if (isAdmin) {
    return <DashboardShell pathname={pathname}><AdminDashboard /></DashboardShell>
  }

  if (isDirectivo) {
    return <DashboardShell pathname={pathname}><DirectivoDashboard /></DashboardShell>
  }

  if (isGestor) {
    return <DashboardShell pathname={pathname}><GestorDashboard /></DashboardShell>
  }

  if (isProfesional) {
    return <DashboardShell pathname={pathname}><ProfesionalDashboard /></DashboardShell>
  }

  const total = metrics?.total_hallazgos ?? 0
  const cerradas = metrics?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  const estadoConFill = porEstado.map((d, i) => ({ ...d, fill: CHART_COLORS_HEX[i % 5] }))
  const planConFill = porEstadoPlan.map((d, i) => ({ ...d, fill: CHART_COLORS_HEX[i % 5] }))

  const vpCtx = {
    vp: {
      metrics,
      porEstado: estadoConFill,
      porEstadoPlan: planConFill,
      porDependencia,
      porResponsable,
      timeline,
      uploads,
      cumplimiento,
      total,
      isVice,
    },
  }

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard de Hallazgos"
          description="Resumen ejecutivo de eventos de riesgo operacional"
          action={
            <Button variant="outline" size="sm" onClick={() => reload(true)} disabled={isRefreshing} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          }
        />

        {loading ? (
          <PageLoader />
        ) : (
          <CustomizableDashboard role="vicepresidente" ctx={vpCtx} />
        )}
      </div>
    </DashboardShell>
  )
}
