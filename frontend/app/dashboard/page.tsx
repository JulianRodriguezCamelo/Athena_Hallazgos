'use client'

import { usePathname } from 'next/navigation'
import {
  AlertTriangle, CheckCircle2, Clock, TrendingUp, Calendar, RefreshCw,
  FileWarning, Zap, ListChecks, Target, BarChart3,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import DirectivoDashboard from './DirectivoDashboard'
import GestorDashboard from './GestorDashboard'
import DashboardShell from '@/components/layout/DashboardShell'
import { PageLoader } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
} from '@/components/ui/chart'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, RadialBar, RadialBarChart } from 'recharts'
import { KpiOverviewSection } from '@/components/organisms/dashboard/KpiOverviewSection'
import { TopResponsablesCard } from '@/components/organisms/dashboard/TopResponsablesCard'
import { CargasRecientesCard } from '@/components/organisms/dashboard/CargasRecientesCard'
import { DonutChartCard } from '@/components/molecules/DonutChartCard'
import { EmptyChart } from '@/components/atoms/EmptyChart'
import { PageHeader } from '@/components/templates/PageHeader'
import { useDashboardData } from '@/hooks/useDashboardData'
import { CHART_COLORS_HEX } from '@/types'

export default function DashboardPage() {
  const pathname = usePathname()
  const { isVice, isDirectivo, isGestor } = useAuth()

  const { metrics, porEstado, porDependencia, porResponsable, timeline, porEstadoPlan, uploads, loading, isRefreshing, reload } = useDashboardData()

  if (isDirectivo) {
    return <DashboardShell pathname={pathname}><DirectivoDashboard /></DashboardShell>
  }

  if (isGestor) {
    return <DashboardShell pathname={pathname}><GestorDashboard /></DashboardShell>
  }

  const total = metrics?.total_hallazgos ?? 0
  const cerradas = metrics?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  const estadoConFill = porEstado.map((d, i) => ({ ...d, fill: CHART_COLORS_HEX[i % 5] }))
  const planConFill = porEstadoPlan.map((d, i) => ({ ...d, fill: CHART_COLORS_HEX[i % 5] }))
  const cumplimientoData = [{ name: 'Cumplimiento', value: cumplimiento, fill: CHART_COLORS_HEX[0] }]
  const timelineForChart = timeline.map((d) => ({ mes: d.name, cerrados: d.value }))

  const primaryKpis = [
    { title: 'Total Hallazgos', value: total, icon: AlertTriangle },
    { title: 'Abiertas', value: metrics?.abiertas ?? 0, icon: Clock, variant: 'warning' as const, subtitle: 'Pendientes de cierre' },
    { title: 'Vencidas', value: metrics?.vencidos ?? 0, icon: FileWarning, variant: 'danger' as const },
    { title: 'Cerradas', value: cerradas, icon: CheckCircle2, variant: 'success' as const, trend: metrics?.cerradas_hoy },
  ]

  const secondaryKpis = [
    { title: 'Total Actividades', value: metrics?.total_actividades ?? 0, icon: ListChecks },
    { title: 'Con Prórroga', value: metrics?.con_prorroga ?? 0, icon: Calendar },
    { title: 'Cerradas Hoy', value: metrics?.cerradas_hoy ?? 0, icon: Zap, variant: 'success' as const },
    { title: 'Índice de Cierre', value: `${cumplimiento}%`, icon: Target, variant: cumplimiento >= 70 ? 'success' as const : 'danger' as const },
  ]

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
          <>
            <KpiOverviewSection primaryItems={primaryKpis} secondaryItems={secondaryKpis} />

            <div className="grid gap-4 lg:grid-cols-3">
              <DonutChartCard
                title="Por Estado"
                description="Estado actual de hallazgos"
                data={estadoConFill}
                centerLabel={String(total)}
                centerSubLabel="total"
              />
              <DonutChartCard
                title="Estado del Plan de Acción"
                description="Distribución por estado del plan"
                data={planConFill}
                centerLabel={String(total)}
                centerSubLabel="total"
              />
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Índice de Cierre</CardTitle>
                      <CardDescription className="text-xs">Hallazgos cerrados vs total</CardDescription>
                    </div>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{ value: { label: 'Cierre' } }} className="mx-auto aspect-square h-[200px]">
                    <RadialBarChart data={cumplimientoData} startAngle={180} endAngle={0} innerRadius={75} outerRadius={105} cx="50%" cy="65%">
                      <RadialBar dataKey="value" cornerRadius={10} fill="var(--color-chart-1)" background={{ fill: 'var(--muted)' }} />
                    </RadialBarChart>
                  </ChartContainer>
                  <div className="text-center -mt-14">
                    <span className="text-4xl font-bold">{cumplimiento}%</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cumplimiento >= 70
                        ? <span className="text-green-500 dark:text-green-400">Buen desempeño</span>
                        : <span className="text-amber-500 dark:text-amber-400">Requiere atención</span>
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Evolución Mensual</CardTitle>
                      <CardDescription className="text-xs">Hallazgos cerrados por mes (últimos 12 meses)</CardDescription>
                    </div>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  {timelineForChart.length === 0 ? <EmptyChart /> : (
                    <ChartContainer config={{ cerrados: { label: 'Cerrados', color: 'var(--chart-2)' } }} className="h-[260px] w-full">
                      <AreaChart data={timelineForChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="fillCerrados" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="var(--muted-foreground)" />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="var(--muted-foreground)" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area type="monotone" dataKey="cerrados" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#fillCerrados)" />
                        <ChartLegend content={<ChartLegendContent />} />
                      </AreaChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {isVice ? 'Hallazgos por Vicepresidencia' : 'Hallazgos por Responsable'}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {isVice ? 'Distribución por Vicepresidencia' : 'Top responsables asignados'}
                      </CardDescription>
                    </div>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  {(isVice ? porDependencia : porResponsable).length === 0 ? <EmptyChart /> : (
                    <ChartContainer config={{ value: { label: 'Hallazgos', color: 'var(--chart-1)' } }} className="h-[260px] w-full">
                      <BarChart data={isVice ? porDependencia : porResponsable} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} vertical />
                        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={10} width={110} stroke="var(--muted-foreground)"
                          tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 14)}…` : v} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} barSize={18} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <TopResponsablesCard responsables={porResponsable} />
              <CargasRecientesCard uploads={uploads} />
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
