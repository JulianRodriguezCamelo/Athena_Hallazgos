'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Clock,
  Calendar,
  RefreshCw,
  FileWarning,
  Target,
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Layers,
  ChevronDown,
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'
import { directivoApi, dashboardApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn, formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
  LabelList,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Metricas {
  total: number
  abiertas: number
  cerradas: number
  vencidos: number
  con_prorroga: number
  mis_actividades: number
}

interface ChartItem { name: string; value: number; fill?: string }

interface HallazgoRow {
  id: number
  codigo_del_hallazgo: string
  descripcion: string
  estado: string
  estado_plan_accion: string | null
  responsable_plan_accion: string | null
  responsable_accion: string | null
  fecha_cierre_proyectada: string | null
  dependencia_reporta_ero: string | null
  prorroga: string | null
}

interface ActividadRow {
  id: number
  hallazgo_id?: number
  codigo_del_hallazgo: string
  descripcion: string | null
  estado_plan_accion: string | null
  responsable: string | null
  estado_accion: string | null
  responsable_accion: string | null
  fecha_compromiso: string | null
}

interface PagedHallazgos { hallazgos: HallazgoRow[]; total: number; page: number; pages: number }
interface PagedActividades { actividades: ActividadRow[]; total: number; page: number; pages: number }

interface HallazgoWithActividades {
  id: number
  codigo: string
  descripcion: string
  estado: string
  actividades: ActividadRow[]
  completadas: number
  total: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS_HEX = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupActivitiesByHallazgo(actividades: ActividadRow[]): HallazgoWithActividades[] {
  const grouped = new Map<string, HallazgoWithActividades>()

  actividades.forEach((act) => {
    const codigo = act.codigo_del_hallazgo
    if (!grouped.has(codigo)) {
      grouped.set(codigo, {
        id: act.hallazgo_id ?? act.id,
        codigo,
        descripcion: act.descripcion ?? 'Plan de acción',
        estado: act.estado_plan_accion ?? 'Pendiente',
        actividades: [],
        completadas: 0,
        total: 0,
      })
    }
    const group = grouped.get(codigo)!
    group.actividades.push(act)
    group.total++
    const lower = act.estado_accion?.toLowerCase() ?? ''
    if (lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')) {
      group.completadas++
    }
  })

  return Array.from(grouped.values())
}

function estadoBadge(estado: string | null) {
  if (!estado) return <Badge variant="outline">—</Badge>
  const lower = estado.toLowerCase()
  if (lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido'))
    return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{estado}</Badge>
  if (lower.includes('vencido') || lower.includes('atraso'))
    return <Badge variant="destructive">{estado}</Badge>
  return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{estado}</Badge>
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null
  const windowSize = 2
  let start = Math.max(1, page - windowSize)
  let end = Math.min(pages, page + windowSize)
  if (end - start < windowSize * 2) {
    if (start === 1) end = Math.min(pages, start + windowSize * 2)
    else start = Math.max(1, end - windowSize * 2)
  }
  const nums: (number | '...')[] = []
  if (start > 1) { nums.push(1); if (start > 2) nums.push('...') }
  for (let p = start; p <= end; p++) nums.push(p)
  if (end < pages) { if (end < pages - 1) nums.push('...'); nums.push(pages) }

  return (
    <div className="flex items-center justify-end gap-1 pt-3">
      <Button variant="outline" size="icon" className="w-7 h-7" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="w-3.5 h-3.5" />
      </Button>
      {nums.map((n, i) =>
        n === '...' ? (
          <span key={`e-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">…</span>
        ) : (
          <Button key={n} variant={n === page ? 'default' : 'ghost'} size="icon" className="w-7 h-7 text-xs" onClick={() => onChange(n)}>
            {n}
          </Button>
        )
      )}
      <Button variant="outline" size="icon" className="w-7 h-7" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground">
      <BarChart3 className="h-7 w-7 mb-2 opacity-30" />
      <p className="text-xs">Sin datos</p>
    </div>
  )
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────
function KpiTile({
  title, value, icon: Icon, variant = 'default', trend,
}: {
  title: string; value: number | string; icon: LucideIcon
  variant?: 'default' | 'success' | 'warning' | 'danger'
  trend?: number
}) {
  const variantStyles: Record<string, string> = {
    default: 'bg-card',
    success: 'bg-green-500/5 border-green-500/20',
    warning: 'bg-amber-500/5 border-amber-500/20',
    danger: 'bg-destructive/5 border-destructive/20',
  }
  const iconStyles: Record<string, string> = {
    default: 'text-muted-foreground',
    success: 'text-green-500',
    warning: 'text-amber-500',
    danger: 'text-destructive',
  }
  return (
    <Card className={cn('overflow-hidden', variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trend !== undefined && (
                <span className={cn('flex items-center text-xs font-medium', trend > 0 ? 'text-green-500' : 'text-destructive')}>
                  {trend > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
          </div>
          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center bg-muted/50', iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Enhanced Donut Card ──────────────────────────────────────────────────────
function EnhancedDonutCard({
  title, description, data, centerLabel, centerSubLabel,
}: {
  title: string; description: string; data: ChartItem[]
  centerLabel: string; centerSubLabel: string
}) {
  if (!data.length) return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent><EmptyChart /></CardContent>
    </Card>
  )

  const total = data.reduce((acc, d) => acc + d.value, 0)
  const chartConfig = data.reduce((acc, item, i) => {
    acc[item.name] = { label: item.name, color: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }
    return acc
  }, {} as Record<string, { label: string; color: string }>)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[180px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={data.map((d, i) => ({ ...d, fill: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }))}
                dataKey="value" nameKey="name"
                innerRadius={50} outerRadius={75}
                paddingAngle={2} strokeWidth={0}
              >
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS_HEX[i % CHART_COLORS_HEX.length]} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{centerLabel}</span>
            <span className="text-xs text-muted-foreground">{centerSubLabel}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-medium">{Math.round((d.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Checklist Item ───────────────────────────────────────────────────────────
function ChecklistItem({ actividad }: { actividad: ActividadRow }) {
  const lower = actividad.estado_accion?.toLowerCase() ?? ''
  const isCompleted = lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')
  const isOverdue = lower.includes('vencido') || lower.includes('atraso')

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border transition-all',
      isCompleted && 'bg-green-500/5 border-green-500/20',
      isOverdue && 'bg-destructive/5 border-destructive/20',
      !isCompleted && !isOverdue && 'bg-muted/30 border-border hover:bg-muted/50',
    )}>
      <div className="pt-0.5">
        {isCompleted
          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
          : isOverdue
            ? <AlertTriangle className="h-4 w-4 text-destructive" />
            : <Circle className="h-4 w-4 text-muted-foreground" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium leading-tight', isCompleted && 'line-through text-muted-foreground')}>
          {actividad.descripcion ?? 'Actividad sin descripción'}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {estadoBadge(actividad.estado_accion)}
          {actividad.responsable_accion && (
            <span className="text-[10px] text-muted-foreground">{actividad.responsable_accion}</span>
          )}
          {actividad.fecha_compromiso && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateTime(actividad.fecha_compromiso)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Hallazgo Checklist Card ──────────────────────────────────────────────────
function HallazgoChecklistCard({ hallazgo }: { hallazgo: HallazgoWithActividades }) {
  const [isOpen, setIsOpen] = useState(false)
  const progressPercent = hallazgo.total > 0 ? Math.round((hallazgo.completadas / hallazgo.total) * 100) : 0

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              progressPercent === 100 && 'bg-green-500/10 text-green-600',
              progressPercent > 50 && progressPercent < 100 && 'bg-amber-500/10 text-amber-600',
              progressPercent <= 50 && 'bg-destructive/10 text-destructive',
            )}>
              {progressPercent}%
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-primary font-semibold">{hallazgo.codigo}</span>
                {estadoBadge(hallazgo.estado)}
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5" title={hallazgo.descripcion}>
                {hallazgo.descripcion}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Actividades</p>
              <p className="text-sm font-semibold">{hallazgo.completadas}/{hallazgo.total}</p>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
          </div>
        </div>
        <Progress value={progressPercent} className="mt-3 h-1.5" />
      </button>
      {isOpen && (
        <>
          <Separator />
          <CardContent className="p-4">
            {hallazgo.actividades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin actividades registradas</p>
            ) : (
              <div className="space-y-2">
                {hallazgo.actividades.map((actividad, idx) => (
                  <ChecklistItem key={actividad.id ?? idx} actividad={actividad} />
                ))}
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DirectivoDashboard() {
  const { user } = useAuth()

  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [porEstado, setPorEstado] = useState<ChartItem[]>([])
  const [porEstadoPlan, setPorEstadoPlan] = useState<ChartItem[]>([])
  const [porEstadoAccion, setPorEstadoAccion] = useState<ChartItem[]>([])

  const [hallazgos, setHallazgos] = useState<PagedHallazgos | null>(null)
  const [hPage, setHPage] = useState(1)

  const [actividades, setActividades] = useState<PagedActividades | null>(null)
  const [aPage, setAPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadCharts = useCallback(async () => {
    const [met, acc, estado, plan] = await Promise.all([
      directivoApi.misMetricas(),
      directivoApi.porEstadoAccion(),
      dashboardApi.porEstado(),
      dashboardApi.porEstadoPlan(),
    ])
    setMetricas(met.data as Metricas)

    const accData = (acc.data as { data: { estado: string; total: number }[] }).data
    setPorEstadoAccion(accData.map((d, i) => ({ name: d.estado, value: d.total, fill: CHART_COLORS_HEX[i % 5] })))

    const estadoData = (estado.data as { data: { estado: string; total: number }[] }).data
    setPorEstado(estadoData.map((d, i) => ({ name: d.estado, value: d.total, fill: CHART_COLORS_HEX[i % 5] })))

    const planData = (plan.data as { data: { estado_plan: string; total: number }[] }).data
    setPorEstadoPlan(planData.map((d, i) => ({ name: d.estado_plan, value: d.total, fill: CHART_COLORS_HEX[i % 5] })))
  }, [])

  const loadHallazgos = useCallback(async (p: number) => {
    try {
      const res = await directivoApi.misHallazgos(p)
      setHallazgos(res.data as PagedHallazgos)
    } catch { /* silent */ }
  }, [])

  const loadActividades = useCallback(async (p: number) => {
    try {
      const res = await directivoApi.misActividades(p)
      setActividades(res.data as PagedActividades)
    } catch { /* silent */ }
  }, [])

  async function load(refresh = false) {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    try {
      await Promise.all([
        loadCharts(),
        loadHallazgos(1),
        loadActividades(1),
      ])
    } catch { /* silent */ } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return }
    loadHallazgos(hPage)
  }, [hPage, loadHallazgos])

  useEffect(() => { loadActividades(aPage) }, [aPage, loadActividades])

  const total = metricas?.total ?? 0
  const cerradas = metricas?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  const hallazgosConActividades = actividades
    ? groupActivitiesByHallazgo(actividades.actividades)
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Cargando…
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mi Panel</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {user?.nombre} · {user?.dependencia ?? user?.vicepresidencia ?? 'Directivo'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KpiTile title="A mi cargo" value={metricas?.total ?? 0} icon={Layers} />
        <KpiTile title="Abiertas" value={metricas?.abiertas ?? 0} icon={Clock} variant="warning" />
        <KpiTile title="Vencidas" value={metricas?.vencidos ?? 0} icon={FileWarning} variant="danger" />
        <KpiTile title="Con Prórroga" value={metricas?.con_prorroga ?? 0} icon={Calendar} />
        <KpiTile title="Actividades" value={metricas?.mis_actividades ?? 0} icon={Activity} />
        <KpiTile title="Índice cierre" value={`${cumplimiento}%`} icon={Target} variant={cumplimiento >= 70 ? 'success' : 'danger'} />
      </div>

      {/* ── Charts Row 1 ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <EnhancedDonutCard
          title="Estado de Hallazgos"
          description="Distribución de mis hallazgos"
          data={porEstado}
          centerLabel={total.toString()}
          centerSubLabel="Total"
        />
        <EnhancedDonutCard
          title="Estado del Plan"
          description="Estado de mis planes de acción"
          data={porEstadoPlan}
          centerLabel={porEstadoPlan.reduce((acc, d) => acc + d.value, 0).toString()}
          centerSubLabel="Planes"
        />

        {/* Índice cierre radial */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Índice de Cierre</CardTitle>
                <CardDescription className="text-xs">Mis hallazgos cerrados vs total</CardDescription>
              </div>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <ChartContainer config={{ value: { label: 'Cierre' } }} className="mx-auto aspect-square h-[180px]">
                <RadialBarChart
                  data={[{
                    name: 'Cumplimiento',
                    value: cumplimiento,
                    fill: cumplimiento >= 70 ? '#22c55e' : cumplimiento >= 40 ? '#f59e0b' : '#ef4444',
                  }]}
                  startAngle={90}
                  endAngle={90 - (cumplimiento * 3.6)}
                  innerRadius={60}
                  outerRadius={85}
                  cx="50%"
                  cy="50%"
                >
                  <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'hsl(var(--muted))' }} />
                </RadialBarChart>
              </ChartContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn(
                  'text-4xl font-bold',
                  cumplimiento >= 70 && 'text-green-500',
                  cumplimiento >= 40 && cumplimiento < 70 && 'text-amber-500',
                  cumplimiento < 40 && 'text-destructive',
                )}>
                  {cumplimiento}%
                </span>
                <p className="text-xs text-muted-foreground mt-1">{cerradas} de {total}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              {cumplimiento >= 70 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Buen desempeño</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-amber-600 font-medium">Requiere atención</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Estado de Acciones bar chart ─────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Estado de mis Acciones</CardTitle>
              <CardDescription className="text-xs">Distribución por estado de acción en mis hallazgos</CardDescription>
            </div>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {porEstadoAccion.length === 0 ? <EmptyChart /> : (
            <ChartContainer
              config={porEstadoAccion.reduce((acc, item, i) => {
                acc[item.name] = { label: item.name, color: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }
                return acc
              }, {} as Record<string, { label: string; color: string }>)}
              className="h-[200px] w-full"
            >
              <BarChart data={porEstadoAccion} layout="vertical" margin={{ left: 0, right: 40 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="name" width={120}
                  tickLine={false} axisLine={false}
                  fontSize={10} stroke="var(--muted-foreground)"
                  tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 16)}…` : v}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                  {porEstadoAccion.map((entry, i) => (
                    <Cell key={i} fill={entry.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length]} />
                  ))}
                  <LabelList dataKey="value" position="right" className="fill-foreground text-xs font-medium" />
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Checklist de Actividades ─────────────────────────────────────── */}
      {hallazgosConActividades.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Mis Actividades</h3>
              <p className="text-xs text-muted-foreground">Actividades asignadas agrupadas por hallazgo</p>
            </div>
          </div>
          <div className="space-y-3">
            {hallazgosConActividades.map((h) => (
              <HallazgoChecklistCard key={h.id} hallazgo={h} />
            ))}
          </div>
          {actividades && actividades.pages > 1 && (
            <div className="mt-3">
              <Pagination page={aPage} pages={actividades.pages} onChange={setAPage} />
            </div>
          )}
        </div>
      )}

      {/* ── Mis Hallazgos Table ──────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Mis Hallazgos</CardTitle>
              <CardDescription className="text-xs">Hallazgos asignados a mi cargo</CardDescription>
            </div>
            {hallazgos && <Badge variant="secondary">{hallazgos.total} registros</Badge>}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {!hallazgos || hallazgos.hallazgos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin registros</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Código</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Descripción</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Estado</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Plan</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Responsable</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Cierre proyectado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {hallazgos.hallazgos.map((h) => (
                      <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-primary whitespace-nowrap">
                          {h.codigo_del_hallazgo}
                        </td>
                        <td className="px-4 py-2.5 max-w-xs truncate text-foreground/80" title={h.descripcion}>
                          {h.descripcion}
                        </td>
                        <td className="px-4 py-2.5">{estadoBadge(h.estado)}</td>
                        <td className="px-4 py-2.5">{estadoBadge(h.estado_plan_accion)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{h.responsable_plan_accion ?? '—'}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {h.fecha_cierre_proyectada ? formatDateTime(h.fecha_cierre_proyectada) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 pb-3">
                <Pagination page={hPage} pages={hallazgos.pages} onChange={setHPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
