'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/templates/PageHeader'
import { CustomizableDashboard } from '@/components/organisms/dashboard/CustomizableDashboard'
import { PageLoader } from '@/components/ui/Spinner'
import { useDashboardData } from '@/hooks/useDashboardData'
import { CHART_COLORS_HEX } from '@/types'

export default function AdminDashboard() {
  const {
    metrics,
    porEstado,
    porDependencia,
    porResponsable,
    timeline,
    porEstadoPlan,
    uploads,
    loading,
    isRefreshing,
    reload,
  } = useDashboardData()

  const total = metrics?.total_hallazgos ?? 0
  const cerradas = metrics?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  const estadoConFill = porEstado.map((d, i) => ({ ...d, fill: CHART_COLORS_HEX[i % 5] }))
  const planConFill = porEstadoPlan.map((d, i) => ({ ...d, fill: CHART_COLORS_HEX[i % 5] }))

  const adminCtx = {
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
      isVice: false,
    },
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel de Administración"
        description="Gestión del sistema y métricas globales de hallazgos"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => reload(true)}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        }
      />

      {loading ? (
        <PageLoader />
      ) : (
        <CustomizableDashboard role="administrador" ctx={adminCtx} />
      )}
    </div>
  )
}
