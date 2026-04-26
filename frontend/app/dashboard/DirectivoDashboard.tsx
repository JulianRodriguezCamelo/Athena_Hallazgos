'use client'

import { Clock, Calendar, RefreshCw, FileWarning, Target, Activity, Layers, TrendingUp } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { KpiRow } from '@/components/molecules/KpiRow'
import { DonutChartCard } from '@/components/molecules/DonutChartCard'
import { ClosureGaugeCard } from '@/components/molecules/ClosureGaugeCard'
import { Pagination } from '@/components/molecules/Pagination'
import { PendingListsTabs } from '@/components/organisms/hallazgos/PendingListsTabs'
import { EstadoAccionesCard } from '@/components/organisms/dashboard/EstadoAccionesCard'
import { DirectivoHallazgosTable } from '@/components/organisms/dashboard/DirectivoHallazgosTable'
import { HallazgoChecklistCard, groupActivitiesByHallazgo } from '@/components/organisms/hallazgos/HallazgoChecklistCard'
import { useDirectivoData } from '@/hooks/useDirectivoData'

const TREND_DATA = [
  { month: 'Ene', cerrados: 4, abiertos: 8 }, { month: 'Feb', cerrados: 6, abiertos: 7 },
  { month: 'Mar', cerrados: 5, abiertos: 9 }, { month: 'Abr', cerrados: 8, abiertos: 6 },
  { month: 'May', cerrados: 7, abiertos: 5 }, { month: 'Jun', cerrados: 9, abiertos: 4 },
]

export default function DirectivoDashboard() {
  const { user } = useAuth()
  const { metricas, porEstado, porEstadoPlan, porEstadoAccion, hallazgos, actividades, hPage, setHPage, aPage, setAPage, loading, refreshing, reload } = useDirectivoData()

  const total = metricas?.total ?? 0
  const cerradas = metricas?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  const hallazgosConActividades = actividades ? groupActivitiesByHallazgo(actividades.actividades) : []
  const pendingHallazgos = (hallazgos?.hallazgos ?? []).filter(
    (h) => !h.estado?.toLowerCase().includes('cerrado') && !h.estado?.toLowerCase().includes('completado')
  )
  const pendingActividades = (actividades?.actividades ?? []).filter((a) => {
    const lower = a.estado_accion?.toLowerCase() ?? ''
    return !lower.includes('cerrado') && !lower.includes('completado') && !lower.includes('cumplido')
  })

  const kpis = [
    { title: 'A mi cargo', value: total, icon: Layers, subtitle: 'Hallazgos totales' },
    { title: 'Abiertas', value: metricas?.abiertas ?? 0, icon: Clock, variant: 'warning' as const, subtitle: 'Requieren atención' },
    { title: 'Vencidas', value: metricas?.vencidos ?? 0, icon: FileWarning, variant: 'danger' as const, subtitle: 'Fuera de plazo' },
    { title: 'Con Prórroga', value: metricas?.con_prorroga ?? 0, icon: Calendar, subtitle: 'Extensión solicitada' },
    { title: 'Actividades', value: metricas?.mis_actividades ?? 0, icon: Activity, subtitle: 'Acciones asignadas' },
    { title: 'Índice cierre', value: `${cumplimiento}%`, icon: Target, variant: cumplimiento >= 70 ? 'success' as const : cumplimiento >= 40 ? 'warning' as const : 'danger' as const },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
      Cargando…
    </div>
  )

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

      <KpiRow items={kpis} columns={6} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PendingListsTabs hallazgos={pendingHallazgos} actividades={pendingActividades} />
        </div>
        <div className="space-y-6">
          <ClosureGaugeCard cumplimiento={cumplimiento} cerradas={cerradas} total={total} description="Mis hallazgos cerrados vs total" />
          <EstadoAccionesCard data={porEstadoAccion} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DonutChartCard title="Estado de Hallazgos" description="Distribución de mis hallazgos" data={porEstado} centerLabel={String(total)} centerSubLabel="Total" />
        <DonutChartCard title="Estado del Plan" description="Estado de mis planes de acción" data={porEstadoPlan} centerLabel={String(porEstadoPlan.reduce((acc, d) => acc + d.value, 0))} centerSubLabel="Planes" />
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Tendencia de Cierre</CardTitle>
                <CardDescription className="text-xs">Evolución de los últimos 6 meses</CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ cerrados: { label: 'Cerrados', color: '#22c55e' }, abiertos: { label: 'Abiertos', color: '#f59e0b' } }} className="h-[200px] w-full">
              <AreaChart data={TREND_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCerradosD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAbiertosD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="cerrados" stroke="#22c55e" strokeWidth={2} fill="url(#colorCerradosD)" />
                <Area type="monotone" dataKey="abiertos" stroke="#f59e0b" strokeWidth={2} fill="url(#colorAbiertosD)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {hallazgosConActividades.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Progreso por Hallazgo</h3>
              <p className="text-xs text-muted-foreground">Actividades asignadas agrupadas por hallazgo</p>
            </div>
          </div>
          <div className="space-y-3">
            {hallazgosConActividades.map((h) => <HallazgoChecklistCard key={h.id} hallazgo={h} />)}
          </div>
          {(actividades?.pages ?? 1) > 1 && (
            <div className="mt-3">
              <Pagination page={aPage} pages={actividades!.pages} onChange={setAPage} />
            </div>
          )}
        </div>
      )}

      <DirectivoHallazgosTable hallazgos={hallazgos} page={hPage} onPageChange={setHPage} />
    </div>
  )
}
