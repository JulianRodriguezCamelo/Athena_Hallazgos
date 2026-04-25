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
  ClipboardList,
  ListTodo,
  ArrowUpRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Area,
  AreaChart,
  CartesianGrid,
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

interface HallazgoRow {
  id: number
  codigo_del_hallazgo: string | null
  descripcion: string | null
  estado: string | null
  estado_plan_accion: string | null
  responsable_plan_accion: string | null
  fecha_cierre_proyectada: string | null
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

interface PagedHallazgos {
  hallazgos: HallazgoRow[]
  total: number
  page: number
  pages: number
}

interface PagedActividades {
  actividades: ActividadRow[]
  total: number
  page: number
  pages: number
}

interface ChartItem { name: string; value: number; fill?: string }

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
const CHART_COLORS_HEX = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

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

// ─── Primitivos reutilizables ─────────────────────────────────────────────────
function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null
  const ws = 2
  let start = Math.max(1, page - ws)
  let end = Math.min(pages, page + ws)
  if (end - start < ws * 2) {
    if (start === 1) end = Math.min(pages, start + ws * 2)
    else start = Math.max(1, end - ws * 2)
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
  title, value, icon: Icon, variant = 'default', trend, subtitle,
}: {
  title: string; value: number | string; icon: LucideIcon
  variant?: 'default' | 'success' | 'warning' | 'danger'
  trend?: number; subtitle?: string
}) {
  const variantStyles: Record<string, string> = {
    default: 'bg-card border-border/50',
    success: 'bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20',
    warning: 'bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20',
    danger: 'bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20',
  }
  const iconStyles: Record<string, string> = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-500/10 text-green-500',
    warning: 'bg-amber-500/10 text-amber-500',
    danger: 'bg-destructive/10 text-destructive',
  }
  return (
    <Card className={cn('overflow-hidden transition-all hover:shadow-md', variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {trend !== undefined && (
                <span className={cn('flex items-center text-xs font-semibold', trend > 0 ? 'text-green-500' : 'text-destructive')}>
                  {trend > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Mini Radial Progress ─────────────────────────────────────────────────────
function MiniRadialProgress({ value, size = 60, strokeWidth = 6, color = '#3b82f6' }: {
  value: number; size?: number; strokeWidth?: number; color?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-muted/30" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold">{value}%</span>
      </div>
    </div>
  )
}

// ─── Enhanced Donut Card ──────────────────────────────────────────────────────
function EnhancedDonutCard({ title, description, data, centerLabel, centerSubLabel }: {
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
          <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[160px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={data.map((d, i) => ({ ...d, fill: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }))}
                dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS_HEX[i % CHART_COLORS_HEX.length]} />)}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{centerLabel}</span>
            <span className="text-[10px] text-muted-foreground">{centerSubLabel}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-1">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-semibold">{Math.round((d.value / total) * 100)}%</span>
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
            : <Circle className="h-4 w-4 text-muted-foreground" />}
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
  const progressColor = progressPercent === 100 ? '#22c55e' : progressPercent > 50 ? '#f59e0b' : '#ef4444'
  return (
    <Card className="overflow-hidden">
      <button type="button" className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <MiniRadialProgress value={progressPercent} size={48} strokeWidth={5} color={progressColor} />
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

// ─── Pending Hallazgo Item ────────────────────────────────────────────────────
function PendingHallazgoItem({ hallazgo }: { hallazgo: HallazgoRow }) {
  const isOverdue = hallazgo.estado?.toLowerCase().includes('vencido')
  const hasProrroga = hallazgo.prorroga === 'Si'
  return (
    <div className={cn(
      'group flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm cursor-pointer',
      isOverdue ? 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10' : 'bg-muted/30 border-border hover:bg-muted/50',
    )}>
      <div className={cn(
        'shrink-0 h-10 w-10 rounded-lg flex items-center justify-center',
        isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
      )}>
        <FileWarning className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-primary font-semibold">{hallazgo.codigo_del_hallazgo}</span>
          {hasProrroga && <Badge variant="outline" className="text-[9px] px-1.5 py-0">Prórroga</Badge>}
        </div>
        <p className="text-sm text-foreground/80 truncate mt-0.5" title={hallazgo.descripcion ?? undefined}>
          {hallazgo.descripcion}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          {estadoBadge(hallazgo.estado)}
          {hallazgo.fecha_cierre_proyectada && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDateTime(hallazgo.fecha_cierre_proyectada)}
            </span>
          )}
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}

// ─── Pending Activity Item ────────────────────────────────────────────────────
function PendingActivityItem({ actividad }: { actividad: ActividadRow }) {
  const lower = actividad.estado_accion?.toLowerCase() ?? ''
  const isCompleted = lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')
  const isOverdue = lower.includes('vencido') || lower.includes('atraso')
  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-xl border transition-all',
      isCompleted && 'bg-green-500/5 border-green-500/20',
      isOverdue && 'bg-destructive/5 border-destructive/20',
      !isCompleted && !isOverdue && 'bg-muted/30 border-border hover:bg-muted/50',
    )}>
      <div className="pt-0.5 shrink-0">
        {isCompleted
          ? <CheckCircle2 className="h-5 w-5 text-green-500" />
          : isOverdue
            ? <AlertTriangle className="h-5 w-5 text-destructive" />
            : <Circle className="h-5 w-5 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] text-primary/70">{actividad.codigo_del_hallazgo}</span>
        </div>
        <p className={cn('text-sm font-medium leading-tight', isCompleted && 'line-through text-muted-foreground')}>
          {actividad.descripcion ?? 'Actividad sin descripción'}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {estadoBadge(actividad.estado_accion)}
          {actividad.responsable_accion && (
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{actividad.responsable_accion}</span>
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

// ─── Pending Lists Tabs ───────────────────────────────────────────────────────
function PendingListsTabs({
  hallazgos, actividades,
}: {
  hallazgos: HallazgoRow[]
  actividades: ActividadRow[]
}) {
  const [tab, setTab] = useState<'hallazgos' | 'actividades'>('hallazgos')
  const emptyHallazgos = hallazgos.length === 0
  const emptyActividades = actividades.length === 0

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as 'hallazgos' | 'actividades')} className="w-full">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="hallazgos" className="gap-2">
          <ClipboardList className="h-4 w-4" />
          Hallazgos Pendientes
          <Badge variant="secondary" className="ml-1">{hallazgos.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="actividades" className="gap-2">
          <ListTodo className="h-4 w-4" />
          Actividades Pendientes
          <Badge variant="secondary" className="ml-1">{actividades.length}</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="hallazgos" className="mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-amber-500" />
              Hallazgos Pendientes de Cierre
            </CardTitle>
            <CardDescription>Hallazgos asignados que requieren acción</CardDescription>
          </CardHeader>
          <CardContent>
            {emptyHallazgos ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-2 text-green-500/50" />
                <p className="text-sm font-medium">¡Excelente!</p>
                <p className="text-xs">No tienes hallazgos pendientes</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {hallazgos.map((h) => <PendingHallazgoItem key={h.id} hallazgo={h} />)}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="actividades" className="mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-primary" />
              Actividades Pendientes
            </CardTitle>
            <CardDescription>Acciones que debes completar</CardDescription>
          </CardHeader>
          <CardContent>
            {emptyActividades ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-2 text-green-500/50" />
                <p className="text-sm font-medium">¡Todo al día!</p>
                <p className="text-xs">No tienes actividades pendientes</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {actividades.map((a) => <PendingActivityItem key={a.id} actividad={a} />)}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

// ─── Cierre Gauge ─────────────────────────────────────────────────────────────
function CierreGauge({ cumplimiento, cerradas, total }: { cumplimiento: number; cerradas: number; total: number }) {
  const color = cumplimiento >= 70 ? '#22c55e' : cumplimiento >= 40 ? '#f59e0b' : '#ef4444'
  return (
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
              data={[{ name: 'Cumplimiento', value: cumplimiento, fill: color }]}
              startAngle={90} endAngle={90 - cumplimiento * 3.6}
              innerRadius={60} outerRadius={85} cx="50%" cy="50%"
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
            <><TrendingUp className="h-4 w-4 text-green-500" /><span className="text-xs text-green-600 font-medium">Buen desempeño</span></>
          ) : (
            <><TrendingDown className="h-4 w-4 text-amber-500" /><span className="text-xs text-amber-600 font-medium">Requiere atención</span></>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Estado Acciones Mini ─────────────────────────────────────────────────────
function EstadoAccionesMini({ data }: { data: ChartItem[] }) {
  const totalAcciones = data.reduce((acc, d) => acc + d.value, 0)
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Estado de Acciones</CardTitle>
        <CardDescription className="text-xs">Distribución de mis actividades</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChart /> : (
          <div className="space-y-3">
            {data.map((item, i) => {
              const percent = Math.round((item.value / totalAcciones) * 100)
              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <Progress
                    value={percent}
                    className="h-1.5"
                    style={{ '--progress-background': CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] } as React.CSSProperties}
                  />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Acciones Bar Chart ───────────────────────────────────────────────────────
function AccionesBarChart({ data }: { data: ChartItem[] }) {
  const config = data.reduce((acc, item, i) => {
    acc[item.name] = { label: item.name, color: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }
    return acc
  }, {} as Record<string, { label: string; color: string }>)

  return (
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
        {data.length === 0 ? <EmptyChart /> : (
          <ChartContainer config={config} className="h-[180px] w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false}
                fontSize={10} stroke="var(--muted-foreground)"
                tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 14)}…` : v} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                {data.map((entry, i) => <Cell key={i} fill={entry.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length]} />)}
                <LabelList dataKey="value" position="right" className="fill-foreground text-xs font-semibold" />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Progreso por Hallazgo ────────────────────────────────────────────────────
function ProgresoHallazgos({
  grupos, aPage, aPages, onPageChange,
}: {
  grupos: HallazgoWithActividades[]
  aPage: number
  aPages: number
  onPageChange: (p: number) => void
}) {
  if (grupos.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Progreso por Hallazgo</h3>
          <p className="text-xs text-muted-foreground">Actividades asignadas agrupadas por hallazgo</p>
        </div>
      </div>
      <div className="space-y-3">
        {grupos.map((h) => <HallazgoChecklistCard key={h.id} hallazgo={h} />)}
      </div>
      {aPages > 1 && (
        <div className="mt-3">
          <Pagination page={aPage} pages={aPages} onChange={onPageChange} />
        </div>
      )}
    </div>
  )
}

// ─── Hallazgos Table ──────────────────────────────────────────────────────────
function HallazgosTable({
  hallazgos, hPage, onPageChange,
}: {
  hallazgos: PagedHallazgos | null
  hPage: number
  onPageChange: (p: number) => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Todos mis Hallazgos</CardTitle>
            <CardDescription className="text-xs">Vista completa de hallazgos asignados</CardDescription>
          </div>
          {hallazgos && <Badge variant="secondary" className="text-xs">{hallazgos.total} registros</Badge>}
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
                    {['Código', 'Descripción', 'Estado', 'Plan', 'Responsable', 'Cierre proyectado'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hallazgos.hallazgos.map((h) => (
                    <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-primary whitespace-nowrap font-semibold">
                        {h.codigo_del_hallazgo}
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-foreground/80" title={h.descripcion ?? undefined}>
                        {h.descripcion}
                      </td>
                      <td className="px-4 py-3">{estadoBadge(h.estado)}</td>
                      <td className="px-4 py-3">{estadoBadge(h.estado_plan_accion)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{h.responsable_plan_accion ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {h.fecha_cierre_proyectada ? formatDateTime(h.fecha_cierre_proyectada) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-3">
              <Pagination page={hPage} pages={hallazgos.pages} onChange={onPageChange} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────
function TrendChart() {
  const trendData = [
    { month: 'Ene', cerrados: 4, abiertos: 8 },
    { month: 'Feb', cerrados: 6, abiertos: 7 },
    { month: 'Mar', cerrados: 5, abiertos: 9 },
    { month: 'Abr', cerrados: 8, abiertos: 6 },
    { month: 'May', cerrados: 7, abiertos: 5 },
    { month: 'Jun', cerrados: 9, abiertos: 4 },
  ]
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Tendencia de Cierre</CardTitle>
        <CardDescription className="text-xs">Evolución de hallazgos en los últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{ cerrados: { label: 'Cerrados', color: '#22c55e' }, abiertos: { label: 'Abiertos', color: '#f59e0b' } }}
          className="h-[200px] w-full"
        >
          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCerrados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAbiertos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="cerrados" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorCerrados)" />
            <Area type="monotone" dataKey="abiertos" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorAbiertos)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
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
      await Promise.all([loadCharts(), loadHallazgos(1), loadActividades(1)])
    } catch { /* silent */ } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return }
    loadHallazgos(hPage)
  }, [hPage, loadHallazgos])

  useEffect(() => { loadActividades(aPage) }, [aPage, loadActividades])

  // ── Derived ──────────────────────────────────────────────────────────────────
  const total = metricas?.total ?? 0
  const cerradas = metricas?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  const hallazgosConActividades = actividades ? groupActivitiesByHallazgo(actividades.actividades) : []

  const pendingHallazgos = hallazgos?.hallazgos.filter(
    (h) => !h.estado?.toLowerCase().includes('cerrado') && !h.estado?.toLowerCase().includes('completado')
  ) ?? []

  const pendingActividades = actividades?.actividades.filter((a) => {
    const lower = a.estado_accion?.toLowerCase() ?? ''
    return !lower.includes('cerrado') && !lower.includes('completado') && !lower.includes('cumplido')
  }) ?? []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-muted-foreground">
        <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Cargando…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mi Panel de Control</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bienvenido, {user?.nombre} · <span className="text-primary">{user?.dependencia ?? user?.vicepresidencia ?? 'Directivo'}</span>
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Actualizar
          </Button>
        </div>

        {/* ── KPI Row ──────────────────────────────────────────────────────── */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <KpiTile title="A mi cargo" value={total} icon={Layers} subtitle="Hallazgos totales" />
          <KpiTile title="Abiertas" value={metricas?.abiertas ?? 0} icon={Clock} variant="warning" subtitle="Requieren atención" />
          <KpiTile title="Vencidas" value={metricas?.vencidos ?? 0} icon={FileWarning} variant="danger" subtitle="Fuera de plazo" />
          <KpiTile title="Con Prórroga" value={metricas?.con_prorroga ?? 0} icon={Calendar} subtitle="Extensión solicitada" />
          <KpiTile title="Actividades" value={metricas?.mis_actividades ?? 0} icon={Activity} subtitle="Acciones asignadas" />
          <KpiTile
            title="Índice cierre" value={`${cumplimiento}%`} icon={Target}
            variant={cumplimiento >= 70 ? 'success' : cumplimiento >= 40 ? 'warning' : 'danger'}
            subtitle={`${cerradas} de ${total} cerrados`}
          />
        </div>

        {/* ── Main Content Grid ────────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PendingListsTabs hallazgos={pendingHallazgos} actividades={pendingActividades} />
          </div>
          <div className="space-y-6">
            <CierreGauge cumplimiento={cumplimiento} cerradas={cerradas} total={total} />
            <EstadoAccionesMini data={porEstadoAccion} />
          </div>
        </div>

        {/* ── Charts Row ─────────────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <EnhancedDonutCard
            title="Estado de Hallazgos" description="Distribución de mis hallazgos"
            data={porEstado} centerLabel={total.toString()} centerSubLabel="Total"
          />
          <EnhancedDonutCard
            title="Estado del Plan" description="Estado de mis planes de acción"
            data={porEstadoPlan}
            centerLabel={porEstadoPlan.reduce((acc, d) => acc + d.value, 0).toString()}
            centerSubLabel="Planes"
          />
          <TrendChart />
        </div>

        {/* ── Acciones Bar Chart ────────────────────────────────────────── */}
        <AccionesBarChart data={porEstadoAccion} />

        {/* ── Progreso por Hallazgo ─────────────────────────────────────── */}
        <ProgresoHallazgos
          grupos={hallazgosConActividades}
          aPage={aPage}
          aPages={actividades?.pages ?? 1}
          onPageChange={setAPage}
        />

        {/* ── Hallazgos Table ──────────────────────────────────────────── */}
        <HallazgosTable hallazgos={hallazgos} hPage={hPage} onPageChange={setHPage} />

      </div>
    </div>
  )
}
