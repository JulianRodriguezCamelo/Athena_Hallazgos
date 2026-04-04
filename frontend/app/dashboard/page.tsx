'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Calendar,
  RefreshCw,
  Upload,
  Users,
  Target,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  FileWarning,
  Zap,
} from 'lucide-react'
import { dashboardApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import DirectivoDashboard from './DirectivoDashboard'
import { formatDateTime } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import { PageLoader } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Metrics {
  total_hallazgos: number
  abiertas: number
  cerradas: number
  cerradas_hoy: number
  con_prorroga: number
  vencidos: number
}

interface ChartItem {
  name: string
  value: number
}

interface TimelineItem {
  name: string
  value: number
}

interface UploadItem {
  filename_original: string
  uploaded_at: string
  total_registros: number
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const pathname = usePathname()
  const { isVice, isDirectivo } = useAuth()

  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [porEstado, setPorEstado] = useState<ChartItem[]>([])
  const [porDependencia, setPorDependencia] = useState<ChartItem[]>([])
  const [porResponsable, setPorResponsable] = useState<ChartItem[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [porEstadoPlan, setPorEstadoPlan] = useState<ChartItem[]>([])
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  async function load(showRefresh = false) {
    if (showRefresh) setIsRefreshing(true)
    else setLoading(true)
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

      const mData = m.data as Metrics
      setMetrics(mData)

      const estadoData = (estado.data as { data: { estado: string; total: number }[] }).data
      setPorEstado(estadoData.map((d) => ({ name: d.estado, value: d.total })))

      const depData = (dep.data as { data: { dependencia: string; total: number }[] }).data
      setPorDependencia(depData.map((d) => ({ name: d.dependencia, value: d.total })))

      const respData = (resp.data as { data: { responsable: string; total: number }[] }).data
      setPorResponsable(respData.map((d) => ({ name: d.responsable, value: d.total })))

      const timeData = (time.data as { data: { mes: string; total: number }[] }).data
      setTimeline(timeData.map((d) => ({ name: d.mes, value: d.total })))

      const planData = (plan.data as { data: { estado_plan: string; total: number }[] }).data
      setPorEstadoPlan(planData.map((d) => ({ name: d.estado_plan, value: d.total })))

      const upData = (up.data as { uploads: UploadItem[] }).uploads
      setUploads(upData)
    } catch {
      // silently handled
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const total = metrics?.total_hallazgos ?? 0
  const cerradas = metrics?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  // ── Chart-ready data with fills ──────────────────────────────────────────────
  const estadoConFill = porEstado.map((d, i) => ({
    ...d,
    fill: [
      'var(--color-chart-3)',
      'var(--color-chart-5)',
      'var(--color-chart-2)',
      'var(--color-chart-4)',
      'var(--color-chart-1)',
    ][i % 5],
  }))

  const planConFill = porEstadoPlan.map((d, i) => ({
    ...d,
    fill: [
      'var(--color-chart-1)',
      'var(--color-chart-2)',
      'var(--color-chart-3)',
      'var(--color-chart-4)',
      'var(--color-chart-5)',
    ][i % 5],
  }))

  const cumplimientoData = [{ name: 'Cumplimiento', value: cumplimiento, fill: 'var(--color-chart-1)' }]

  // ── Timeline formatted for dual-key area chart ───────────────────────────────
  // The backend returns total per month; we display as "cerrados" line
  const timelineForChart = timeline.map((d) => ({ mes: d.name, cerrados: d.value }))

  // ── Top responsable max for progress bar ────────────────────────────────────
  const maxResp = porResponsable.length > 0 ? Math.max(...porResponsable.map((r) => r.value)) : 1

  if (isDirectivo) {
    return (
      <DashboardShell pathname={pathname}>
        <DirectivoDashboard />
      </DashboardShell>
    )
  }

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-6">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard de Hallazgos</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Resumen ejecutivo de eventos de riesgo operacional
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(true)}
            className="gap-2 self-start sm:self-auto"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {loading ? (
          <PageLoader />
        ) : (
          <>
            {/* ── KPI Row 1 ────────────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Total Hallazgos"
                value={metrics?.total_hallazgos ?? 0}
                icon={AlertTriangle}
              />
              <KpiCard
                title="Abiertas"
                value={metrics?.abiertas ?? 0}
                icon={Clock}
                subtitle="Pendientes de cierre"
                variant="warning"
              />
              <KpiCard
                title="Vencidas"
                value={metrics?.vencidos ?? 0}
                icon={FileWarning}
                subtitle="Sin cerrar"
                variant="danger"
              />
              <KpiCard
                title="Cerradas"
                value={metrics?.cerradas ?? 0}
                icon={CheckCircle2}
                trend={metrics?.cerradas_hoy}
                trendLabel="cerradas hoy"
                trendUp={true}
                variant="success"
              />
            </div>

            {/* ── KPI Row 2 ────────────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <KpiCardMini
                title="Con Prórroga"
                value={metrics?.con_prorroga ?? 0}
                icon={Calendar}
              />
              <KpiCardMini
                title="Cerradas Hoy"
                value={metrics?.cerradas_hoy ?? 0}
                icon={Zap}
                variant="success"
              />
              <KpiCardMini
                title="Índice de Cierre"
                value={`${cumplimiento}%`}
                icon={Target}
                variant={cumplimiento >= 70 ? 'success' : 'danger'}
              />
            </div>

            {/* ── Charts Row 1 ─────────────────────────────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Distribución por estado */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Distribución por Estado</CardTitle>
                      <CardDescription className="text-xs">Estado actual de hallazgos</CardDescription>
                    </div>
                    <PieChartIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  {estadoConFill.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <>
                      <ChartContainer config={{ value: { label: 'Cantidad' } }} className="mx-auto aspect-square h-[200px]">
                        <PieChart>
                          <Pie
                            data={estadoConFill}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            strokeWidth={2}
                            stroke="var(--background)"
                          >
                            {estadoConFill.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                      <div className="mt-3 flex flex-wrap justify-center gap-3">
                        {estadoConFill.map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span className="text-xs text-muted-foreground">{item.name}</span>
                            <span className="text-xs font-semibold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Estado del plan de acción */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Plan de Acción</CardTitle>
                      <CardDescription className="text-xs">Estado de los planes de cierre</CardDescription>
                    </div>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  {planConFill.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <>
                      <ChartContainer config={{ value: { label: 'Cantidad' } }} className="mx-auto aspect-square h-[200px]">
                        <PieChart>
                          <Pie
                            data={planConFill}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            strokeWidth={2}
                            stroke="var(--background)"
                          >
                            {planConFill.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ChartContainer>
                      <div className="mt-3 flex flex-wrap justify-center gap-3">
                        {planConFill.map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span className="text-xs text-muted-foreground">{item.name}</span>
                            <span className="text-xs font-semibold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Índice de cumplimiento */}
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
                    <RadialBarChart
                      data={cumplimientoData}
                      startAngle={180}
                      endAngle={0}
                      innerRadius={75}
                      outerRadius={105}
                      cx="50%"
                      cy="65%"
                    >
                      <RadialBar
                        dataKey="value"
                        cornerRadius={10}
                        fill="var(--color-chart-1)"
                        background={{ fill: 'var(--muted)' }}
                      />
                    </RadialBarChart>
                  </ChartContainer>
                  <div className="text-center -mt-14">
                    <span className="text-4xl font-bold">{cumplimiento}%</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cumplimiento >= 70 ? (
                        <span className="text-green-500 dark:text-green-400">Buen desempeño</span>
                      ) : (
                        <span className="text-amber-500 dark:text-amber-400">Requiere atención</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Charts Row 2 ─────────────────────────────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Evolución mensual */}
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
                  {timelineForChart.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ChartContainer
                      config={{
                        cerrados: { label: 'Cerrados', color: 'var(--chart-2)' },
                      }}
                      className="h-[260px] w-full"
                    >
                      <AreaChart data={timelineForChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="fillCerrados" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="mes"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          fontSize={11}
                          stroke="var(--muted-foreground)"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          fontSize={11}
                          stroke="var(--muted-foreground)"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="cerrados"
                          stroke="var(--color-chart-2)"
                          strokeWidth={2}
                          fill="url(#fillCerrados)"
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                      </AreaChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Hallazgos por dirección (solo para vicePresidente) o por estado del plan */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {isVice ? 'Hallazgos por Dirección' : 'Hallazgos por Responsable'}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {isVice ? 'Distribución por área organizacional' : 'Top responsables asignados'}
                      </CardDescription>
                    </div>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  {(isVice ? porDependencia : porResponsable).length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ChartContainer
                      config={{ value: { label: 'Hallazgos', color: 'var(--chart-1)' } }}
                      className="h-[260px] w-full"
                    >
                      <BarChart
                        data={isVice ? porDependencia : porResponsable}
                        layout="vertical"
                        margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} vertical={true} />
                        <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          fontSize={10}
                          width={110}
                          stroke="var(--muted-foreground)"
                          tickFormatter={(value: string) => value.length > 14 ? `${value.slice(0, 14)}…` : value}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} barSize={18} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ── Bottom Row ───────────────────────────────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Top Responsables */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Top Responsables</CardTitle>
                      <CardDescription className="text-xs">Por cantidad de hallazgos asignados</CardDescription>
                    </div>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {porResponsable.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                  ) : (
                    porResponsable.slice(0, 5).map((item, index) => {
                      const initials = item.name
                        .split(' ')
                        .slice(0, 2)
                        .map((w) => w.charAt(0).toUpperCase())
                        .join('')
                      return (
                        <div key={item.name} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-4 text-right">{index + 1}</span>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <Progress value={(item.value / maxResp) * 100} className="h-1.5 mt-1" />
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {item.value}
                          </Badge>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              {/* Cargas recientes */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Cargas Recientes</CardTitle>
                      <CardDescription className="text-xs">Últimos archivos cargados al sistema</CardDescription>
                    </div>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-2 divide-y divide-border">
                  {uploads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Sin cargas recientes</p>
                  ) : (
                    uploads.map((u, i) => (
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
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {u.total_registros} reg.
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  trendLabel,
  trendUp,
  variant = 'default',
}: {
  title: string
  value: number | string
  icon: React.ElementType
  subtitle?: string
  trend?: number
  trendLabel?: string
  trendUp?: boolean
  variant?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const variantStyles: Record<string, string> = {
    default: 'border-border',
    success: 'border-green-500/30 bg-green-500/5 dark:border-green-400/30 dark:bg-green-400/5',
    warning: 'border-amber-500/30 bg-amber-500/5 dark:border-amber-400/30 dark:bg-amber-400/5',
    danger:  'border-destructive/30 bg-destructive/5',
  }

  const iconStyles: Record<string, string> = {
    default: 'text-primary',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger:  'text-destructive',
  }

  return (
    <Card className={`${variantStyles[variant]} transition-all hover:shadow-md`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend !== undefined && (
              <div className="flex items-center gap-1">
                {trendUp ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-destructive" />
                )}
                <span className={`text-xs font-medium ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                  {trend > 0 ? '+' : ''}{trend}
                </span>
                <span className="text-xs text-muted-foreground">{trendLabel}</span>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-secondary p-2.5">
            <Icon className={`h-5 w-5 ${iconStyles[variant]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Mini KPI Card ───────────────────────────────────────────────────────────
function KpiCardMini({
  title,
  value,
  icon: Icon,
  variant = 'default',
}: {
  title: string
  value: number | string
  icon: React.ElementType
  variant?: 'default' | 'success' | 'danger'
}) {
  const iconStyles: Record<string, string> = {
    default: 'text-primary',
    success: 'text-green-600 dark:text-green-400',
    danger:  'text-destructive',
  }

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-lg bg-secondary p-2.5">
          <Icon className={`h-4 w-4 ${iconStyles[variant]}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Empty Chart ─────────────────────────────────────────────────────────────
function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
      <BarChart3 className="h-8 w-8 mb-2 opacity-30" />
      <p className="text-xs">Sin datos disponibles</p>
    </div>
  )
}
