'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { gestorApi, hallazgosApi, uploadsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
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
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Play,
  FileText,
  Upload,
  MessageSquare,
  History,
  Users,
  Timer,
  Shield,
  Bell,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit3,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import Select from '@/components/ui/Select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
interface MetricasGestor {
  total: number
  abiertas: number
  cerradas: number
  vencidos: number
  proximos_vencer: number
  con_prorroga: number
  en_proceso: number
  pendientes_validacion: number
  mis_actividades: number
  evidencias_pendientes: number
}

interface ChartItem { name: string; value: number; fill?: string }

interface HallazgoRow {
  id: number
  codigo_del_hallazgo: string | null
  descripcion: string | null
  estado: string
  estado_plan_accion: string | null
  responsable_plan_accion: string | null
  responsable_accion: string | null
  fecha_cierre_proyectada: string | null
  dependencia_reporta_ero: string | null
  prorroga: string | null
  prioridad: 'alta' | 'media' | 'baja'
  dias_restantes: number
  sla_dias: number
  workflow_estado: WorkflowEstado
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

interface BitacoraEntry {
  id: number
  fecha: string
  usuario: string
  accion: string
  detalle: string
}

interface ResponsableCritico {
  nombre: string
  hallazgos_vencidos: number
  hallazgos_activos: number
  cumplimiento: number
}

type WorkflowEstado = 'abierto' | 'en_analisis' | 'en_ejecucion' | 'en_validacion' | 'cerrado'

interface HallazgoWithActividades {
  id: number
  codigo: string
  descripcion: string
  estado: string
  prioridad: 'alta' | 'media' | 'baja'
  dias_restantes: number
  workflow_estado: WorkflowEstado
  actividades: ActividadRow[]
  completadas: number
  total: number
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS_HEX = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

const WORKFLOW_STEPS: { estado: WorkflowEstado; label: string; icon: LucideIcon }[] = [
  { estado: 'abierto',       label: 'Abierto',      icon: Circle },
  { estado: 'en_analisis',   label: 'En Análisis',  icon: Search },
  { estado: 'en_ejecucion',  label: 'En Ejecución', icon: Play },
  { estado: 'en_validacion', label: 'En Validación',icon: Shield },
  { estado: 'cerrado',       label: 'Cerrado',       icon: CheckCircle2 },
]

const PRIORIDAD_CONFIG = {
  alta:  { color: 'bg-red-500/10 text-red-600 border-red-500/20',    label: 'Alta' },
  media: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Media' },
  baja:  { color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Baja' },
}

const CARDS_PER_PAGE = 9   // 3 cols × 3 rows

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(dateString: string | null) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function groupActivitiesByHallazgo(actividades: ActividadRow[], hallazgos: HallazgoRow[]): HallazgoWithActividades[] {
  const grouped = new Map<string, HallazgoWithActividades>()
  actividades.forEach((act) => {
    const codigo = act.codigo_del_hallazgo
    const info = hallazgos.find(h => h.codigo_del_hallazgo === codigo)
    if (!grouped.has(codigo)) {
      grouped.set(codigo, {
        id: act.hallazgo_id ?? act.id,
        codigo,
        descripcion: act.descripcion ?? 'Plan de acción',
        estado: act.estado_plan_accion ?? 'Pendiente',
        prioridad: info?.prioridad ?? 'media',
        dias_restantes: info?.dias_restantes ?? 0,
        workflow_estado: info?.workflow_estado ?? 'abierto',
        actividades: [],
        completadas: 0,
        total: 0,
      })
    }
    const group = grouped.get(codigo)!
    group.actividades.push(act)
    group.total++
    const lower = act.estado_accion?.toLowerCase() ?? ''
    if (lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')) group.completadas++
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
  if (lower.includes('validac'))
    return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">{estado}</Badge>
  return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{estado}</Badge>
}

function semaforoBadge(dias: number) {
  if (dias < 0)
    return <Badge variant="destructive" className="gap-1 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-current" />Vencido</Badge>
  if (dias <= 7)
    return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Próximo</Badge>
  return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />En tiempo</Badge>
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button variant="outline" size="icon" className="w-8 h-8" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="w-3.5 h-3.5" />
      </Button>
      {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
        <Button key={n} variant={n === page ? 'default' : 'ghost'} size="icon" className="w-8 h-8 text-xs" onClick={() => onChange(n)}>
          {n}
        </Button>
      ))}
      <Button variant="outline" size="icon" className="w-8 h-8" disabled={page >= pages} onClick={() => onChange(page + 1)}>
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

function KpiTile({ title, value, icon: Icon, variant = 'default', trend, subtitle }: {
  title: string; value: number | string; icon: LucideIcon
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  trend?: number; subtitle?: string
}) {
  const variantStyles: Record<string, string> = {
    default: 'bg-card', success: 'bg-green-500/5 border-green-500/20',
    warning: 'bg-amber-500/5 border-amber-500/20', danger: 'bg-destructive/5 border-destructive/20',
    info: 'bg-blue-500/5 border-blue-500/20',
  }
  const iconStyles: Record<string, string> = {
    default: 'text-muted-foreground', success: 'text-green-500',
    warning: 'text-amber-500', danger: 'text-destructive', info: 'text-blue-500',
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
                <span className={cn('flex items-center text-xs', trend > 0 ? 'text-green-500' : 'text-destructive')}>
                  {trend > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center bg-muted/50', iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

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
  const config = data.reduce((acc, item, i) => {
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
          <ChartContainer config={config} className="mx-auto aspect-square h-[180px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={data.map((d, i) => ({ ...d, fill: d.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }))}
                dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2} strokeWidth={0}>
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
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-medium">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── WorkflowStepper ─────────────────────────────────────────────────────────
function WorkflowStepper({ currentEstado }: { currentEstado: WorkflowEstado }) {
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.estado === currentEstado)
  return (
    <div className="flex items-start justify-between w-full gap-1">
      {WORKFLOW_STEPS.map((step, index) => {
        const Icon = step.icon
        const isCurrent = index === currentIndex
        const isPast = index < currentIndex
        return (
          <div key={step.estado} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 flex-none">
              <div className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center transition-all border-2',
                isCurrent && 'bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 ring-offset-2 ring-offset-background shadow-md shadow-primary/20',
                isPast && 'bg-green-500/10 border-green-500/50 text-green-500',
                !isCurrent && !isPast && 'bg-muted/20 border-border/40 text-muted-foreground/30',
              )}>
                {isPast
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <Icon className="h-4 w-4" />}
              </div>
              <span className={cn('text-[10px] font-medium text-center leading-tight max-w-[60px]',
                isCurrent && 'text-primary font-semibold',
                isPast && 'text-green-500',
                !isCurrent && !isPast && 'text-muted-foreground/40',
              )}>
                {step.label}
              </span>
            </div>
            {index < WORKFLOW_STEPS.length - 1 && (
              <div className={cn('h-0.5 flex-1 mx-1 mb-5 rounded-full',
                isPast ? 'bg-green-500/40' : 'bg-muted/25',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Tiempo Promedio ──────────────────────────────────────────────────────────
function TiempoPromedioCard({ data }: { data: { name: string; value: number }[] }) {
  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b']
  const hasData = data.some(d => d.value > 0)
  const maxVal = Math.max(...data.map(d => d.value), 1)
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Tiempo Promedio por Etapa</CardTitle>
            <CardDescription className="text-xs">Días promedio en cada fase del workflow</CardDescription>
          </div>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-[140px] gap-2 text-muted-foreground">
            <Timer className="h-8 w-8 opacity-20" />
            <p className="text-xs text-center">Aún no hay datos de tiempo.<br />Se calculará cuando los hallazgos avancen de etapa.</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {data.map((item, i) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    {item.value > 0
                      ? <span style={{ color: COLORS[i % COLORS.length] }}>{item.value} días</span>
                      : <span className="text-muted-foreground text-xs">Sin datos</span>}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: item.value > 0 ? `${Math.max(Math.round((item.value / maxVal) * 100), 3)}%` : '0%',
                      backgroundColor: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Checklist Item (read-only display in modal) ──────────────────────────────
function ChecklistItem({ actividad }: { actividad: ActividadRow }) {
  const lower = actividad.estado_accion?.toLowerCase() ?? ''
  const isCompleted = lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')
  const isOverdue = lower.includes('vencido') || lower.includes('atraso')
  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border',
      isCompleted && 'bg-green-500/5 border-green-500/20',
      isOverdue && 'bg-destructive/5 border-destructive/20',
      !isCompleted && !isOverdue && 'bg-muted/30 border-border',
    )}>
      <div className="pt-0.5 shrink-0">
        {isCompleted
          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
          : isOverdue
            ? <AlertTriangle className="h-4 w-4 text-destructive" />
            : <Circle className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium leading-tight', isCompleted && 'line-through text-muted-foreground')}>
          {actividad.descripcion ?? 'Sin descripción'}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {estadoBadge(actividad.estado_accion)}
          {actividad.responsable_accion && (
            <span className="text-[10px] text-muted-foreground">{actividad.responsable_accion}</span>
          )}
          {actividad.fecha_compromiso && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {fmtDate(actividad.fecha_compromiso)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Hallazgo Card (in 3-col grid) ───────────────────────────────────────────
function HallazgoCard({ hallazgo }: { hallazgo: HallazgoWithActividades }) {
  const progress = hallazgo.total > 0 ? Math.round((hallazgo.completadas / hallazgo.total) * 100) : 0
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group">
          <CardContent className="p-4 space-y-3">
            {/* Top row: code + badges */}
            <div className="flex flex-wrap items-start gap-1.5">
              <span className="font-mono text-xs font-bold text-primary">{hallazgo.codigo}</span>
              <Badge className={cn('text-[10px]', PRIORIDAD_CONFIG[hallazgo.prioridad].color)}>
                {PRIORIDAD_CONFIG[hallazgo.prioridad].label}
              </Badge>
              {semaforoBadge(hallazgo.dias_restantes)}
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground line-clamp-2 leading-snug min-h-[2.5rem]" title={hallazgo.descripcion}>
              {hallazgo.descripcion}
            </p>

            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progreso</span>
                <span className={cn('font-bold tabular-nums',
                  progress === 100 ? 'text-green-500' : progress >= 50 ? 'text-amber-500' : 'text-destructive'
                )}>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground text-right">
                {hallazgo.completadas}/{hallazgo.total} actividades
              </p>
            </div>

            {/* Estado */}
            <div className="flex items-center justify-between">
              {estadoBadge(hallazgo.estado)}
              <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">Ver detalle →</span>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-primary">{hallazgo.codigo}</span>
            <Badge className={PRIORIDAD_CONFIG[hallazgo.prioridad].color}>
              {PRIORIDAD_CONFIG[hallazgo.prioridad].label}
            </Badge>
            {semaforoBadge(hallazgo.dias_restantes)}
          </DialogTitle>
          <DialogDescription className="text-left">{hallazgo.descripcion}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Progress summary */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40">
            <div className={cn(
              'h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2',
              progress === 100 ? 'border-green-500 text-green-600' : progress >= 50 ? 'border-amber-500 text-amber-600' : 'border-destructive/60 text-destructive',
            )}>
              {progress}%
            </div>
            <div className="flex-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {hallazgo.completadas} de {hallazgo.total} actividades completadas
              </p>
            </div>
          </div>

          {/* Workflow Stepper */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-medium">Estado en el proceso</p>
            <WorkflowStepper currentEstado={hallazgo.workflow_estado} />
          </div>

          <Separator />

          {/* Actividades */}
          <div>
            <p className="text-sm font-semibold mb-3">Actividades ({hallazgo.total})</p>
            {hallazgo.actividades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Sin actividades registradas</p>
            ) : (
              <div className="space-y-2">
                {hallazgo.actividades.map((act, idx) => (
                  <ChecklistItem key={act.id ?? idx} actividad={act} />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Alert Card (Seguimiento) ────────────────────────────────────────────────
function AlertCard({
  hallazgo,
  type,
  detalle,
}: {
  hallazgo: HallazgoRow
  type: 'vencido' | 'proximo'
  detalle: HallazgoWithActividades | undefined
}) {
  const isVencido = type === 'vencido'
  const progress = detalle && detalle.total > 0 ? Math.round((detalle.completadas / detalle.total) * 100) : 0
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className={cn(
          'overflow-hidden cursor-pointer transition-all hover:shadow-md group',
          isVencido
            ? 'border-destructive/30 bg-destructive/5 hover:border-destructive/50'
            : 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50',
        )}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {isVencido
                  ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  : <Clock className="h-4 w-4 text-amber-500 shrink-0" />}
                <span className="font-mono text-xs font-bold text-primary truncate">
                  {hallazgo.codigo_del_hallazgo ?? '—'}
                </span>
              </div>
              <Badge className={cn('shrink-0 text-[10px]', PRIORIDAD_CONFIG[hallazgo.prioridad].color)}>
                {PRIORIDAD_CONFIG[hallazgo.prioridad].label}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug min-h-[2rem]">
              {hallazgo.descripcion ?? '—'}
            </p>

            <div className="flex items-center justify-between">
              {isVencido
                ? <Badge variant="destructive" className="text-[10px]">
                    Vencido {Math.abs(hallazgo.dias_restantes)}d
                  </Badge>
                : <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                    {hallazgo.dias_restantes}d restantes
                  </Badge>}
              <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                Ver detalle →
              </span>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-primary">{hallazgo.codigo_del_hallazgo ?? '—'}</span>
            <Badge className={PRIORIDAD_CONFIG[hallazgo.prioridad].color}>
              {PRIORIDAD_CONFIG[hallazgo.prioridad].label}
            </Badge>
            {semaforoBadge(hallazgo.dias_restantes)}
          </DialogTitle>
          <DialogDescription className="text-left">{hallazgo.descripcion ?? '—'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Progress summary */}
          {detalle && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40">
              <div className={cn(
                'h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2',
                progress === 100 ? 'border-green-500 text-green-600' : progress >= 50 ? 'border-amber-500 text-amber-600' : 'border-destructive/60 text-destructive',
              )}>
                {progress}%
              </div>
              <div className="flex-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {detalle.completadas} de {detalle.total} actividades completadas
                </p>
              </div>
            </div>
          )}

          {/* Workflow */}
          <div>
            <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Estado en el proceso</p>
            <WorkflowStepper currentEstado={hallazgo.workflow_estado} />
          </div>

          <Separator />

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Estado</p>
              <p>{estadoBadge(hallazgo.estado)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Responsable</p>
              <p className="font-medium">{hallazgo.responsable_plan_accion ?? '—'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Fecha cierre proyectada</p>
              <p className="font-medium">{fmtDate(hallazgo.fecha_cierre_proyectada)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-muted-foreground">Dependencia</p>
              <p className="font-medium">{hallazgo.dependencia_reporta_ero ?? '—'}</p>
            </div>
          </div>

          {/* Actividades */}
          {detalle && detalle.actividades.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-semibold mb-3">Actividades ({detalle.total})</p>
                <div className="space-y-2">
                  {detalle.actividades.map((act, idx) => (
                    <ChecklistItem key={act.id ?? idx} actividad={act} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Bitácora ─────────────────────────────────────────────────────────────────
function BitacoraCard({ entries }: { entries: BitacoraEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Bitácora de Actividad</CardTitle>
            <CardDescription className="text-xs">Últimas acciones realizadas</CardDescription>
          </div>
          <History className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[260px] pr-3">
          <div className="space-y-3">
            {entries.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Sin registros</p>
            )}
            {entries.map((entry) => (
              <div key={entry.id} className="flex gap-3 pb-3 border-b border-border last:border-0">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{entry.accion}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{entry.fecha}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.detalle}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">por {entry.usuario}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

// ─── Responsables Críticos ────────────────────────────────────────────────────
function ResponsablesCriticosCard({ responsables }: { responsables: ResponsableCritico[] }) {
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  async function handleEnviarRecordatorios() {
    setEnviando(true)
    setFeedback(null)
    try {
      await gestorApi.enviarRecordatorios()
      setFeedback({ ok: true, msg: 'Recordatorios enviados correctamente' })
    } catch {
      setFeedback({ ok: false, msg: 'Error al enviar recordatorios' })
    } finally {
      setEnviando(false)
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Responsables Críticos</CardTitle>
            <CardDescription className="text-xs">Requieren seguimiento inmediato</CardDescription>
          </div>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {responsables.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Sin datos</p>
        ) : (
          <div className="space-y-2">
            {responsables.map((resp, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{resp.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {resp.hallazgos_vencidos}v · {resp.hallazgos_activos}a
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className={cn('text-base font-bold',
                    resp.cumplimiento >= 70 ? 'text-green-500' : resp.cumplimiento >= 40 ? 'text-amber-500' : 'text-destructive',
                  )}>{resp.cumplimiento}%</p>
                  <p className="text-[9px] text-muted-foreground">cumplim.</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {feedback && (
          <p className={cn('text-xs mt-2 text-center', feedback.ok ? 'text-green-500' : 'text-destructive')}>
            {feedback.msg}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3 gap-1.5"
          onClick={handleEnviarRecordatorios}
          disabled={enviando}
        >
          <Bell className="h-3.5 w-3.5" />
          {enviando ? 'Enviando…' : 'Enviar recordatorios'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Modales de hallazgo ─────────────────────────────────────────────────────

const ESTADOS_HALLAZGO = [
  'Abierta', 'En Proceso', 'En Revisión', 'Pendiente de Validación', 'Cerrada', 'Vencida',
]

function ModalVerDetalle({ h, open, onClose }: { h: HallazgoRow | null; open: boolean; onClose: () => void }) {
  if (!h) return null
  const rows: [string, string | null][] = [
    ['Código', h.codigo_del_hallazgo],
    ['Estado', h.estado],
    ['Estado plan', h.estado_plan_accion],
    ['Prioridad', h.prioridad],
    ['Responsable plan', h.responsable_plan_accion],
    ['Responsable acción', h.responsable_accion],
    ['Dependencia', h.dependencia_reporta_ero],
    ['Cierre proyectado', h.fecha_cierre_proyectada ? fmtDate(h.fecha_cierre_proyectada) : null],
    ['Prórroga', h.prorroga],
    ['Días restantes', String(h.dias_restantes)],
  ]
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Detalle — {h.codigo_del_hallazgo ?? `#${h.id}`}
          </DialogTitle>
          <DialogDescription className="text-xs line-clamp-2">{h.descripcion}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-2">
          {rows.map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-sm mt-0.5">{val ?? '—'}</p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModalEditarPlan({ h, open, onClose, onSaved }: { h: HallazgoRow | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ responsable_plan_accion: '', responsable_accion: '', estado_plan_accion: '', fecha_cierre_proyectada: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (h) setForm({
      responsable_plan_accion: h.responsable_plan_accion ?? '',
      responsable_accion: h.responsable_accion ?? '',
      estado_plan_accion: h.estado_plan_accion ?? '',
      fecha_cierre_proyectada: h.fecha_cierre_proyectada ? h.fecha_cierre_proyectada.slice(0, 10) : '',
    })
  }, [h])

  async function handleSave() {
    if (!h) return
    setSaving(true)
    setError('')
    try {
      await hallazgosApi.update(h.id, form)
      onSaved()
      onClose()
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (!h) return null
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Editar plan — {h.codigo_del_hallazgo ?? `#${h.id}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responsable plan de acción</Label>
            <Input value={form.responsable_plan_accion} onChange={e => setForm(f => ({ ...f, responsable_plan_accion: e.target.value }))} placeholder="Nombre del responsable" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responsable de acción</Label>
            <Input value={form.responsable_accion} onChange={e => setForm(f => ({ ...f, responsable_accion: e.target.value }))} placeholder="Nombre del responsable" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado plan</Label>
            <Input value={form.estado_plan_accion} onChange={e => setForm(f => ({ ...f, estado_plan_accion: e.target.value }))} placeholder="Estado del plan de acción" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha cierre proyectada</Label>
            <Input type="date" value={form.fecha_cierre_proyectada} onChange={e => setForm(f => ({ ...f, fecha_cierre_proyectada: e.target.value }))} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModalSubirEvidencia({ h, open, onClose }: { h: HallazgoRow | null; open: boolean; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleClose() {
    setFile(null)
    setResult(null)
    onClose()
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setResult(null)
    try {
      await uploadsApi.upload(file)
      setResult({ ok: true, msg: 'Evidencia subida correctamente.' })
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch {
      setResult({ ok: false, msg: 'Error al subir el archivo. Intenta de nuevo.' })
    } finally {
      setUploading(false)
    }
  }

  if (!h) return null
  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Subir evidencia — {h.codigo_del_hallazgo ?? `#${h.id}`}
          </DialogTitle>
          <DialogDescription className="text-xs">Selecciona un archivo (PDF, imagen, Excel)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file && <p className="text-xs text-muted-foreground">Archivo: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          {result && <p className={cn('text-xs', result.ok ? 'text-green-500' : 'text-destructive')}>{result.msg}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={uploading}>Cancelar</Button>
          <Button size="sm" onClick={handleUpload} disabled={!file || uploading}>{uploading ? 'Subiendo…' : 'Subir'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModalCambiarEstado({ h, open, onClose, onSaved }: { h: HallazgoRow | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [estado, setEstado] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (h) setEstado(h.estado ?? '') }, [h])

  async function handleSave() {
    if (!h || !estado) return
    setSaving(true)
    setError('')
    try {
      await hallazgosApi.update(h.id, { estado })
      onSaved()
      onClose()
    } catch {
      setError('Error al cambiar el estado. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (!h) return null
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Cambiar estado — {h.codigo_del_hallazgo ?? `#${h.id}`}
          </DialogTitle>
          <DialogDescription className="text-xs line-clamp-2">{h.descripcion}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado actual</Label>
            <p className="text-sm">{h.estado ?? '—'}</p>
          </div>
          <Select
            label="Nuevo estado"
            value={estado}
            options={ESTADOS_HALLAZGO.map(e => ({ value: e, label: e }))}
            onChange={e => setEstado(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={!estado || saving}>{saving ? 'Guardando…' : 'Confirmar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModalSolicitarProrroga({ h, open, onClose, onSaved }: { h: HallazgoRow | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [fecha, setFecha] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (!open) { setFecha(''); setJustificacion(''); setError('') } }, [open])

  async function handleSave() {
    if (!h || !fecha) return
    setSaving(true)
    setError('')
    try {
      const prorroga = justificacion ? `${fecha} — ${justificacion}` : fecha
      await hallazgosApi.update(h.id, { prorroga, fecha_cierre_proyectada: fecha })
      onSaved()
      onClose()
    } catch {
      setError('Error al registrar la prórroga. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (!h) return null
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Solicitar prórroga — {h.codigo_del_hallazgo ?? `#${h.id}`}
          </DialogTitle>
          <DialogDescription className="text-xs">Establece una nueva fecha de cierre y una justificación.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nueva fecha de cierre</Label>
            <Input type="date" value={fecha} min={new Date().toISOString().slice(0, 10)} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Justificación</Label>
            <Textarea
              placeholder="Describe el motivo de la prórroga…"
              className="resize-none text-sm"
              rows={3}
              value={justificacion}
              onChange={e => setJustificacion(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={!fecha || saving}>{saving ? 'Guardando…' : 'Registrar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GestorDashboard() {
  const { user } = useAuth()

  const [metricas, setMetricas] = useState<MetricasGestor | null>(null)
  const [porEstado, setPorEstado] = useState<ChartItem[]>([])
  const [porEstadoPlan, setPorEstadoPlan] = useState<ChartItem[]>([])
  const [porSemaforo, setPorSemaforo] = useState<ChartItem[]>([])
  const [tiempoPromedio, setTiempoPromedio] = useState<{ name: string; value: number }[]>([])
  const [hallazgos, setHallazgos] = useState<HallazgoRow[]>([])
  const [actividades, setActividades] = useState<ActividadRow[]>([])
  const [bitacora, setBitacora] = useState<BitacoraEntry[]>([])
  const [responsablesCriticos, setResponsablesCriticos] = useState<ResponsableCritico[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchH, setSearchH] = useState('')    // hallazgos tab search
  const [searchA, setSearchA] = useState('')    // actividades tab search
  const [hPage, setHPage] = useState(1)
  const [aPage, setAPage] = useState(1)
  const [activeTab, setActiveTab] = useState('overview')

  // Modales de hallazgo
  type ModalType = 'detalle' | 'editar' | 'evidencia' | 'estado' | 'prorroga' | null
  const [modalOpen, setModalOpen] = useState<ModalType>(null)
  const [modalHallazgo, setModalHallazgo] = useState<HallazgoRow | null>(null)

  function openModal(type: ModalType, h: HallazgoRow) {
    setModalHallazgo(h)
    setModalOpen(type)
  }
  function closeModal() { setModalOpen(null) }

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    try {
      const [metR, estR, planR, semR, hR, aR, respR, bitR, tpR] = await Promise.all([
        gestorApi.misMetricas(),
        gestorApi.porEstado(),
        gestorApi.porEstadoPlan(),
        gestorApi.porSemaforo(),
        gestorApi.hallazgos(1, 100),
        gestorApi.actividades(1, 200),
        gestorApi.responsablesCriticos(),
        gestorApi.bitacora(),
        gestorApi.tiempoPromedio(),
      ])

      setMetricas(metR.data as MetricasGestor)

      const C = CHART_COLORS_HEX
      const eD = (estR.data as { data: { name: string; value: number }[] }).data
      setPorEstado(eD.map((d, i) => ({ ...d, fill: C[i % C.length] })))

      const pD = (planR.data as { data: { name: string; value: number }[] }).data
      setPorEstadoPlan(pD.map((d, i) => ({ ...d, fill: C[i % C.length] })))

      const sD = (semR.data as { data: ChartItem[] }).data
      setPorSemaforo(sD)

      setHallazgos((hR.data as { hallazgos: HallazgoRow[] }).hallazgos)
      setActividades((aR.data as { actividades: ActividadRow[] }).actividades)
      setResponsablesCriticos((respR.data as { data: ResponsableCritico[] }).data)
      setBitacora((bitR.data as { entries: BitacoraEntry[] }).entries)

      const tp = (tpR.data as { data: { name: string; value: number }[] }).data
      setTiempoPromedio(tp)
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const total = metricas?.total ?? 0
  const cerradas = metricas?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  const hallazgosConActividades = groupActivitiesByHallazgo(actividades, hallazgos)

  // Hallazgos tab — filtered + paginated table
  const filtH = hallazgos.filter(h => {
    const t = searchH.toLowerCase()
    return (h.codigo_del_hallazgo ?? '').toLowerCase().includes(t) ||
      (h.descripcion ?? '').toLowerCase().includes(t) ||
      (h.responsable_plan_accion ?? '').toLowerCase().includes(t)
  })
  const H_PAGE = 10
  const pagedH = filtH.slice((hPage - 1) * H_PAGE, hPage * H_PAGE)
  useEffect(() => { setHPage(1) }, [searchH])

  // Actividades tab — filtered + paginated cards
  const filtA = hallazgosConActividades.filter(h => {
    const t = searchA.toLowerCase()
    return h.codigo.toLowerCase().includes(t) || h.descripcion.toLowerCase().includes(t)
  })
  const pagedA = filtA.slice((aPage - 1) * CARDS_PER_PAGE, aPage * CARDS_PER_PAGE)
  const aPagesTotal = Math.ceil(filtA.length / CARDS_PER_PAGE)
  useEffect(() => { setAPage(1) }, [searchA])

  // Seguimiento — alerts
  const vencidos = hallazgos.filter(h => h.dias_restantes < 0)
  const proximos = hallazgos.filter(h => h.dias_restantes >= 0 && h.dias_restantes <= 7)
  const [vPage, setVPage] = useState(1)
  const [pPage, setPPage] = useState(1)
  const SEG_PER_PAGE = 9
  const pagedVencidos = vencidos.slice((vPage - 1) * SEG_PER_PAGE, vPage * SEG_PER_PAGE)
  const pagedProximos = proximos.slice((pPage - 1) * SEG_PER_PAGE, pPage * SEG_PER_PAGE)
  const vPages = Math.ceil(vencidos.length / SEG_PER_PAGE)
  const pPages = Math.ceil(proximos.length / SEG_PER_PAGE)

  // SLA calculated from real data
  const noCerrado = (h: HallazgoRow) => !(h.estado ?? '').toLowerCase().includes('cerrado')
  const slaEnTiempo = hallazgos.filter(h => noCerrado(h) && h.dias_restantes > 7).length
  const slaEnRiesgo = hallazgos.filter(h => noCerrado(h) && h.dias_restantes >= 0 && h.dias_restantes <= 7).length
  const slaFuera = hallazgos.filter(h => noCerrado(h) && h.dias_restantes < 0).length
  const slaActivos = slaEnTiempo + slaEnRiesgo + slaFuera
  const slaPct = slaActivos > 0 ? Math.round((slaEnTiempo / slaActivos) * 100) : 0
  const tpPromedio = tiempoPromedio.length > 0
    ? Math.round(tiempoPromedio.filter(d => d.value > 0).reduce((s, d) => s + d.value, 0) / (tiempoPromedio.filter(d => d.value > 0).length || 1))
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <RefreshCw className="animate-spin w-5 h-5 mr-2" />
        Cargando…
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Panel del Gestor</h1>
            <p className="text-sm text-muted-foreground">
              Gestión operativa · <span className="font-medium">{user?.dependencia ?? 'Sin dependencia'}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => loadData(true)} disabled={refreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Actualizar
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <FileText className="h-3.5 w-3.5" />
                Nuevo Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Plan de Acción</DialogTitle>
                <DialogDescription>Defina el plan de acción para atender un hallazgo.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hallazgo asociado</label>
                  <Input placeholder="Buscar hallazgo..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descripción del plan</label>
                  <Textarea placeholder="Describa las acciones a realizar..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Responsable</label>
                    <Input placeholder="Nombre del responsable" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha compromiso</label>
                    <Input type="date" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Cancelar</Button>
                <Button>Crear plan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="hallazgos" className="gap-2">
            <FileWarning className="h-4 w-4" />
            <span className="hidden sm:inline">Hallazgos</span>
          </TabsTrigger>
          <TabsTrigger value="actividades" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Actividades</span>
          </TabsTrigger>
          <TabsTrigger value="seguimiento" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Seguimiento</span>
          </TabsTrigger>
        </TabsList>

        {/* ── RESUMEN ──────────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <KpiTile title="Total a cargo" value={metricas?.total ?? 0} icon={Layers} subtitle="Hallazgos en gestión" />
            <KpiTile title="En Proceso" value={metricas?.en_proceso ?? 0} icon={Play} variant="info" subtitle="Ejecutándose" />
            <KpiTile title="Vencidos" value={metricas?.vencidos ?? 0} icon={FileWarning} variant="danger" subtitle="Requieren atención" />
            <KpiTile title="Próximos" value={metricas?.proximos_vencer ?? 0} icon={Clock} variant="warning" subtitle="Próximos 7 días" />
            <KpiTile title="Índice cierre" value={`${cumplimiento}%`} icon={Target} variant={cumplimiento >= 70 ? 'success' : 'danger'} subtitle={`${cerradas}/${total} cerrados`} />
          </div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <KpiTile title="Evidencias pend." value={metricas?.evidencias_pendientes ?? 0} icon={Upload} />
            <KpiTile title="En validación" value={metricas?.pendientes_validacion ?? 0} icon={Shield} variant="info" />
            <KpiTile title="Con prórroga" value={metricas?.con_prorroga ?? 0} icon={Calendar} />
            <KpiTile title="Mis actividades" value={metricas?.mis_actividades ?? 0} icon={Activity} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <EnhancedDonutCard title="Semáforo de Riesgo" description="Cumplimiento por fecha" data={porSemaforo} centerLabel={total.toString()} centerSubLabel="Total" />
            <EnhancedDonutCard title="Estado de Hallazgos" description="Distribución por estado" data={porEstado} centerLabel={total.toString()} centerSubLabel="Hallazgos" />
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
                    <RadialBarChart data={[{ name: 'Cumplimiento', value: cumplimiento, fill: cumplimiento >= 70 ? '#22c55e' : cumplimiento >= 40 ? '#f59e0b' : '#ef4444' }]}
                      startAngle={90} endAngle={90 - (cumplimiento * 3.6)} innerRadius={60} outerRadius={85} cx="50%" cy="50%">
                      <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'hsl(var(--muted))' }} />
                    </RadialBarChart>
                  </ChartContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn('text-4xl font-bold',
                      cumplimiento >= 70 && 'text-green-500',
                      cumplimiento >= 40 && cumplimiento < 70 && 'text-amber-500',
                      cumplimiento < 40 && 'text-destructive',
                    )}>{cumplimiento}%</span>
                    <p className="text-xs text-muted-foreground mt-1">{cerradas} de {total}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  {cumplimiento >= 70
                    ? <><TrendingUp className="h-4 w-4 text-green-500" /><span className="text-xs text-green-600 font-medium">Buen desempeño</span></>
                    : <><TrendingDown className="h-4 w-4 text-amber-500" /><span className="text-xs text-amber-600 font-medium">Requiere atención</span></>
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TiempoPromedioCard data={tiempoPromedio} />
            <ResponsablesCriticosCard responsables={responsablesCriticos} />
          </div>

          <BitacoraCard entries={bitacora} />
        </TabsContent>

        {/* ── HALLAZGOS ────────────────────────────────────────────────────── */}
        <TabsContent value="hallazgos" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar código, descripción o responsable..."
                className="pl-9" value={searchH} onChange={e => setSearchH(e.target.value)} />
            </div>
            <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="px-5 py-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">Hallazgos en Gestión</CardTitle>
                  <CardDescription className="text-xs">Asignados a mi dependencia</CardDescription>
                </div>
                <Badge variant="secondary">{filtH.length} registros</Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {filtH.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Sin registros</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          {['Código', 'Descripción', 'Prioridad', 'Semáforo', 'Estado', 'Responsable', 'Cierre', ''].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {pagedH.map(h => (
                          <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-[11px] text-primary whitespace-nowrap">{h.codigo_del_hallazgo ?? '—'}</td>
                            <td className="px-4 py-2.5 max-w-xs truncate text-foreground/80">{h.descripcion ?? '—'}</td>
                            <td className="px-4 py-2.5"><Badge className={PRIORIDAD_CONFIG[h.prioridad].color}>{PRIORIDAD_CONFIG[h.prioridad].label}</Badge></td>
                            <td className="px-4 py-2.5">{semaforoBadge(h.dias_restantes)}</td>
                            <td className="px-4 py-2.5">{estadoBadge(h.estado)}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{h.responsable_plan_accion ?? '—'}</td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(h.fecha_cierre_proyectada)}</td>
                            <td className="px-4 py-2.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openModal('detalle', h)}><Eye className="h-3.5 w-3.5 mr-2" />Ver detalle</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openModal('editar', h)}><Edit3 className="h-3.5 w-3.5 mr-2" />Editar plan</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openModal('evidencia', h)}><Upload className="h-3.5 w-3.5 mr-2" />Subir evidencia</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openModal('estado', h)}><Play className="h-3.5 w-3.5 mr-2" />Cambiar estado</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openModal('prorroga', h)}><Calendar className="h-3.5 w-3.5 mr-2" />Solicitar prórroga</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 pb-3">
                    <Pagination page={hPage} pages={Math.ceil(filtH.length / H_PAGE)} onChange={setHPage} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ACTIVIDADES ──────────────────────────────────────────────────── */}
        <TabsContent value="actividades" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Actividades por Hallazgo</h3>
              <p className="text-xs text-muted-foreground">Haz clic en una tarjeta para ver el detalle y workflow</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-9" value={searchA} onChange={e => setSearchA(e.target.value)} />
            </div>
          </div>

          {filtA.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                Sin actividades registradas
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pagedA.map(h => (
                  <HallazgoCard key={h.id} hallazgo={h} />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {(aPage - 1) * CARDS_PER_PAGE + 1}–{Math.min(aPage * CARDS_PER_PAGE, filtA.length)} de {filtA.length} hallazgos
                </p>
                <Pagination page={aPage} pages={aPagesTotal} onChange={setAPage} />
              </div>
            </>
          )}
        </TabsContent>

        {/* ── SEGUIMIENTO ──────────────────────────────────────────────────── */}
        <TabsContent value="seguimiento" className="space-y-6">

          {/* SLA strip */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <KpiTile title="En SLA" value={`${slaPct}%`} icon={Target} variant={slaPct >= 70 ? 'success' : 'danger'} subtitle="Cumplimiento" />
            <KpiTile title="En tiempo" value={slaEnTiempo} icon={CheckCircle2} variant="success" />
            <KpiTile title="En riesgo" value={slaEnRiesgo} icon={Clock} variant="warning" />
            <KpiTile title="Fuera SLA" value={slaFuera} icon={AlertTriangle} variant="danger" />
          </div>

          {/* Vencidos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold">Vencidos</h3>
                <Badge variant="destructive" className="text-[10px]">{vencidos.length}</Badge>
              </div>
              {vPages > 1 && (
                <p className="text-xs text-muted-foreground">
                  {(vPage - 1) * SEG_PER_PAGE + 1}–{Math.min(vPage * SEG_PER_PAGE, vencidos.length)} de {vencidos.length}
                </p>
              )}
            </div>
            {vencidos.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />Sin vencidos
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pagedVencidos.map(h => (
                    <AlertCard
                      key={h.id}
                      hallazgo={h}
                      type="vencido"
                      detalle={hallazgosConActividades.find(ha => ha.codigo === h.codigo_del_hallazgo)}
                    />
                  ))}
                </div>
                <Pagination page={vPage} pages={vPages} onChange={setVPage} />
              </>
            )}
          </div>

          {/* Próximos a vencer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Próximos a vencer</h3>
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">{proximos.length}</Badge>
              </div>
              {pPages > 1 && (
                <p className="text-xs text-muted-foreground">
                  {(pPage - 1) * SEG_PER_PAGE + 1}–{Math.min(pPage * SEG_PER_PAGE, proximos.length)} de {proximos.length}
                </p>
              )}
            </div>
            {proximos.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                  Sin hallazgos próximos a vencer (7 días)
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pagedProximos.map(h => (
                    <AlertCard
                      key={h.id}
                      hallazgo={h}
                      type="proximo"
                      detalle={hallazgosConActividades.find(ha => ha.codigo === h.codigo_del_hallazgo)}
                    />
                  ))}
                </div>
                <Pagination page={pPage} pages={pPages} onChange={setPPage} />
              </>
            )}
          </div>

          {/* Responsables + Bitácora */}
          <div className="grid gap-4 lg:grid-cols-2">
            <ResponsablesCriticosCard responsables={responsablesCriticos} />
            <BitacoraCard entries={bitacora} />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Modales ─────────────────────────────────────────────────────── */}
      <ModalVerDetalle h={modalHallazgo} open={modalOpen === 'detalle'} onClose={closeModal} />
      <ModalEditarPlan h={modalHallazgo} open={modalOpen === 'editar'} onClose={closeModal} onSaved={() => loadData(true)} />
      <ModalSubirEvidencia h={modalHallazgo} open={modalOpen === 'evidencia'} onClose={closeModal} />
      <ModalCambiarEstado h={modalHallazgo} open={modalOpen === 'estado'} onClose={closeModal} onSaved={() => loadData(true)} />
      <ModalSolicitarProrroga h={modalHallazgo} open={modalOpen === 'prorroga'} onClose={closeModal} onSaved={() => loadData(true)} />
    </div>
  )
}
