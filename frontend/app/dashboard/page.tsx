'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Calendar,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { dashboardApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDateTime } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import KpiCard from '@/components/ui/KpiCard'
import PieChart from '@/components/charts/PieChart'
import BarChart from '@/components/charts/BarChart'
import LineChart from '@/components/charts/LineChart'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface Metrics {
  total_hallazgos: number
  abiertas: number
  cerradas: number
  cerradas_hoy: number
  con_prorroga: number
  vencidos: number
}

interface ChartItem { name: string; value: number }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground/80">{title}</CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const pathname = usePathname()
  const { isVice } = useAuth()

  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [porEstado, setPorEstado] = useState<ChartItem[]>([])
  const [porDependencia, setPorDependencia] = useState<ChartItem[]>([])
  const [porResponsable, setPorResponsable] = useState<ChartItem[]>([])
  const [timeline, setTimeline] = useState<ChartItem[]>([])
  const [porEstadoPlan, setPorEstadoPlan] = useState<ChartItem[]>([])
  const [uploads, setUploads] = useState<{ filename_original: string; uploaded_at: string; total_registros: number }[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [m, estado, dep, resp, time, plan, up] = await Promise.all([
        dashboardApi.metrics(),
        dashboardApi.porEstado(),
        dashboardApi.porDependencia(),
        dashboardApi.porResponsable(),
        dashboardApi.timeline(),
        dashboardApi.porEstadoPlan(),
        dashboardApi.uploadsRecientes(),
      ])
      setMetrics(m.data)
      setPorEstado(estado.data.data.map((d: { estado: string; total: number }) => ({ name: d.estado, value: d.total })))
      setPorDependencia(dep.data.data.map((d: { dependencia: string; total: number }) => ({ name: d.dependencia, value: d.total })))
      setPorResponsable(resp.data.data.map((d: { responsable: string; total: number }) => ({ name: d.responsable, value: d.total })))
      setTimeline(time.data.data.map((d: { mes: string; total: number }) => ({ name: d.mes, value: d.total })))
      setPorEstadoPlan(plan.data.data.map((d: { estado_plan: string; total: number }) => ({ name: d.estado_plan, value: d.total })))
      setUploads(up.data.uploads)
    } catch {
      // silently handled
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary">Dashboard de Hallazgos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Resumen ejecutivo de eventos de riesgo operacional
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </Button>
        </div>

        {loading ? (
          <PageLoader />
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <KpiCard
                title="Total hallazgos"
                value={metrics?.total_hallazgos ?? 0}
                icon={AlertTriangle}
                variant="default"
              />
              <KpiCard
                title="Abiertas"
                value={metrics?.abiertas ?? 0}
                subtitle="Pendientes de cierre"
                icon={Clock}
                variant="warning"
              />
              <KpiCard
                title="Cerradas"
                value={metrics?.cerradas ?? 0}
                icon={CheckCircle}
                variant="success"
              />
              <KpiCard
                title="Con prórroga"
                value={metrics?.con_prorroga ?? 0}
                icon={Calendar}
                variant="accent"
              />
              <KpiCard
                title="Vencidas"
                value={metrics?.vencidos ?? 0}
                subtitle="Sin cerrar"
                icon={TrendingUp}
                variant="danger"
              />
              <KpiCard
                title="Cerradas hoy"
                value={metrics?.cerradas_hoy ?? 0}
                icon={CheckCircle}
                variant="success"
              />
            </div>

            {/* Row 1: Pie + Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <Section title="Distribución por estado">
                <PieChart data={porEstado} />
              </Section>

              {isVice && (
                <Section title="Hallazgos por dirección">
                  <BarChart data={porDependencia} showValues />
                </Section>
              )}

              <Section title="Estado del plan de acción">
                <PieChart data={porEstadoPlan} />
              </Section>
            </div>

            {/* Row 2: Line + Horizontal bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Section title="Evolución mensual (últimos 12 meses)">
                <LineChart data={timeline} />
              </Section>

              <Section title="Top responsables">
                <BarChart data={porResponsable} horizontal height={300} />
              </Section>
            </div>

            {/* Recent uploads */}
            {uploads.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-foreground/80">
                    Cargas recientes
                  </CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="pt-2 divide-y divide-border">
                  {uploads.map((u, i) => (
                    <div key={i} className="flex items-center gap-3 py-3 first:pt-2 last:pb-2">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Upload className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate font-medium">
                          {u.filename_original}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(u.uploaded_at)}</p>
                      </div>
                      <Badge variant="secondary" className="text-accent font-semibold shrink-0">
                        {u.total_registros} reg.
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  )
}
