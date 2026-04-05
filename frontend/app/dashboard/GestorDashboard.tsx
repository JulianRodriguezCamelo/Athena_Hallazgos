'use client'

import { useEffect, useState, useCallback } from 'react'
import { gestorApi } from '@/lib/api'
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
  ChevronDown,
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
  codigo_del_hallazgo: string
  descripcion: string
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
  nombre_plan_accion: string | null
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
const CHART_COLORS_HEX = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
]

const WORKFLOW_STEPS: { estado: WorkflowEstado; label: string; icon: LucideIcon }[] = [
  { estado: 'abierto', label: 'Abierto', icon: Circle },
  { estado: 'en_analisis', label: 'En Análisis', icon: Search },
  { estado: 'en_ejecucion', label: 'En Ejecución', icon: Play },
  { estado: 'en_validacion', label: 'En Validación', icon: Shield },
  { estado: 'cerrado', label: 'Cerrado', icon: CheckCircle2 },
]

const PRIORIDAD_CONFIG = {
  alta: { color: 'bg-red-500/10 text-red-600 border-red-500/20', label: 'Alta' },
  media: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Media' },
  baja: { color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Baja' },
}

// (mock data removed — data comes from API)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function groupActivitiesByHallazgo(actividades: ActividadRow[], hallazgos: HallazgoRow[]): HallazgoWithActividades[] {
  const grouped = new Map<string, HallazgoWithActividades>()

  actividades.forEach((act) => {
    const codigo = act.codigo_del_hallazgo
    const hallazgoInfo = hallazgos.find(h => h.codigo_del_hallazgo === codigo)
    
    if (!grouped.has(codigo)) {
      grouped.set(codigo, {
        id: act.hallazgo_id ?? act.id,
        codigo,
        descripcion: act.nombre_plan_accion ?? 'Plan de acción',
        estado: act.estado_plan_accion ?? 'Pendiente',
        prioridad: hallazgoInfo?.prioridad ?? 'media',
        dias_restantes: hallazgoInfo?.dias_restantes ?? 0,
        workflow_estado: hallazgoInfo?.workflow_estado ?? 'abierto',
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
  if (lower.includes('validación') || lower.includes('validacion'))
    return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">{estado}</Badge>
  return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{estado}</Badge>
}

function semaforoBadge(diasRestantes: number) {
  if (diasRestantes < 0) {
    return <Badge variant="destructive" className="gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Vencido</Badge>
  }
  if (diasRestantes <= 7) {
    return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Próximo</Badge>
  }
  return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />En tiempo</Badge>
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
  title, value, icon: Icon, variant = 'default', trend, subtitle,
}: {
  title: string; value: number | string; icon: LucideIcon
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  trend?: number
  subtitle?: string
}) {
  const variantStyles: Record<string, string> = {
    default: 'bg-card',
    success: 'bg-green-500/5 border-green-500/20',
    warning: 'bg-amber-500/5 border-amber-500/20',
    danger: 'bg-destructive/5 border-destructive/20',
    info: 'bg-blue-500/5 border-blue-500/20',
  }
  const iconStyles: Record<string, string> = {
    default: 'text-muted-foreground',
    success: 'text-green-500',
    warning: 'text-amber-500',
    danger: 'text-destructive',
    info: 'text-blue-500',
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
                data={data.map((d, i) => ({ ...d, fill: d.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }))}
                dataKey="value" nameKey="name"
                innerRadius={50} outerRadius={75}
                paddingAngle={2} strokeWidth={0}
              >
                {data.map((entry, i) => <Cell key={i} fill={entry.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length]} />)}
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
              <span className="font-medium">{Math.round((d.value / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Workflow Stepper ─────────────────────────────────────────────────────────
function WorkflowStepper({ currentEstado, onChangeEstado }: { currentEstado: WorkflowEstado; onChangeEstado?: (estado: WorkflowEstado) => void }) {
  const currentIndex = WORKFLOW_STEPS.findIndex(s => s.estado === currentEstado)
  
  return (
    <div className="flex items-center justify-between w-full">
      {WORKFLOW_STEPS.map((step, index) => {
        const Icon = step.icon
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isClickable = onChangeEstado && (index === currentIndex + 1 || index === currentIndex - 1)
        
        return (
          <div key={step.estado} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onChangeEstado?.(step.estado)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg transition-all',
                isClickable && 'hover:bg-muted cursor-pointer',
                !isClickable && 'cursor-default'
              )}
            >
              <div className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center transition-all',
                isCompleted && 'bg-green-500 text-white',
                isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/20',
                !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <span className={cn(
                'text-[10px] font-medium',
                isCurrent && 'text-primary',
                !isCurrent && 'text-muted-foreground'
              )}>
                {step.label}
              </span>
            </button>
            {index < WORKFLOW_STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mx-1',
                index < currentIndex ? 'bg-green-500' : 'bg-muted'
              )} />
            )}
          </div>
        )
      })}
    </div>
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
          {actividad.descripcion ?? actividad.nombre_plan_accion ?? 'Actividad sin descripción'}
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
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
          <MoreVertical className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem><Edit3 className="h-3.5 w-3.5 mr-2" />Editar</DropdownMenuItem>
          <DropdownMenuItem><Upload className="h-3.5 w-3.5 mr-2" />Subir evidencia</DropdownMenuItem>
          <DropdownMenuItem><MessageSquare className="h-3.5 w-3.5 mr-2" />Comentar</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem><CheckCircle2 className="h-3.5 w-3.5 mr-2" />Marcar completada</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-primary font-semibold">{hallazgo.codigo}</span>
                {estadoBadge(hallazgo.estado)}
                <Badge className={PRIORIDAD_CONFIG[hallazgo.prioridad].color}>
                  {PRIORIDAD_CONFIG[hallazgo.prioridad].label}
                </Badge>
                {semaforoBadge(hallazgo.dias_restantes)}
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
          <CardContent className="p-4 space-y-4">
            {/* Workflow Stepper */}
            <div className="py-2">
              <p className="text-xs text-muted-foreground mb-3">Estado del workflow</p>
              <WorkflowStepper currentEstado={hallazgo.workflow_estado} />
            </div>
            <Separator />
            {hallazgo.actividades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin actividades registradas</p>
            ) : (
              <div className="space-y-2">
                {hallazgo.actividades.map((actividad, idx) => (
                  <ChecklistItem key={actividad.id ?? idx} actividad={actividad} />
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" className="gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                Subir evidencia
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Comentar
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Solicitar prórroga
              </Button>
            </div>
          </CardContent>
        </>
      )}
    </Card>
  )
}

// ─── Bitácora Component ───────────────────────────────────────────────────────
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
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="flex gap-3 pb-3 border-b border-border last:border-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{entry.accion}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{entry.fecha}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.detalle}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">por {entry.usuario}</p>
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
        <div className="space-y-3">
          {responsables.map((resp, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-medium">{resp.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {resp.hallazgos_vencidos} vencidos · {resp.hallazgos_activos} activos
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  'text-lg font-bold',
                  resp.cumplimiento >= 70 && 'text-green-500',
                  resp.cumplimiento >= 40 && resp.cumplimiento < 70 && 'text-amber-500',
                  resp.cumplimiento < 40 && 'text-destructive',
                )}>
                  {resp.cumplimiento}%
                </p>
                <p className="text-[10px] text-muted-foreground">cumplimiento</p>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          Enviar recordatorios
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
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

  // loading starts true so initial render shows spinner without setState in effect
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [hPage, setHPage] = useState(1)
  const [activeTab, setActiveTab] = useState('overview')

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)

    try {
      const [
        metricasRes, porEstadoRes, porEstadoPlanRes, porSemaforoRes,
        hallazgosRes, actividadesRes, responsablesRes, bitacoraRes, tiempoRes,
      ] = await Promise.all([
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

      setMetricas(metricasRes.data as MetricasGestor)

      const colors = CHART_COLORS_HEX
      const estadoData = (porEstadoRes.data as { data: { name: string; value: number }[] }).data
      setPorEstado(estadoData.map((d, i) => ({ ...d, fill: colors[i % colors.length] })))

      const planData = (porEstadoPlanRes.data as { data: { name: string; value: number }[] }).data
      setPorEstadoPlan(planData.map((d, i) => ({ ...d, fill: colors[i % colors.length] })))

      const semaforoData = (porSemaforoRes.data as { data: ChartItem[] }).data
      setPorSemaforo(semaforoData)

      const hData = (hallazgosRes.data as { hallazgos: HallazgoRow[] }).hallazgos
      setHallazgos(hData)

      const aData = (actividadesRes.data as { actividades: ActividadRow[] }).actividades
      setActividades(aData)

      const respData = (responsablesRes.data as { data: ResponsableCritico[] }).data
      setResponsablesCriticos(respData)

      const bitData = (bitacoraRes.data as { entries: BitacoraEntry[] }).entries
      setBitacora(bitData)

      const tpData = (tiempoRes.data as { data: { name: string; value: number }[] }).data
      setTiempoPromedio(tpData)
    } catch {
      // errors silently handled; UI will show empty states
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const total = metricas?.total ?? 0
  const cerradas = metricas?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  const hallazgosConActividades = groupActivitiesByHallazgo(actividades, hallazgos)

  const filteredHallazgos = hallazgos.filter(h =>
    h.codigo_del_hallazgo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.responsable_plan_accion?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    setHPage(1)
  }, [searchTerm])

  const PAGE_SIZE = 10
  const pagedHallazgos = filteredHallazgos.slice((hPage - 1) * PAGE_SIZE, hPage * PAGE_SIZE)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
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
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Panel del Gestor</h1>
                <p className="text-sm text-muted-foreground">
                  Gestión operativa de hallazgos · Dependencia: <span className="font-medium">{user?.dependencia ?? 'Sin dependencia'}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => loadData(true)} disabled={refreshing}>
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              Actualizar
            </Button>
            <Dialog>
              <DialogTrigger render={<Button size="sm" className="gap-2" />}>
                <FileText className="h-3.5 w-3.5" />
                Nuevo Plan
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Plan de Acción</DialogTitle>
                  <DialogDescription>
                    Defina el plan de acción para atender un hallazgo.
                  </DialogDescription>
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

        {/* ── Tabs Navigation ──────────────────────────────────────────────── */}
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

          {/* ── Overview Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Row */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              <KpiTile title="Total a cargo" value={metricas?.total ?? 0} icon={Layers} subtitle="Hallazgos en gestión" />
              <KpiTile title="En Proceso" value={metricas?.en_proceso ?? 0} icon={Play} variant="info" subtitle="Ejecutándose ahora" />
              <KpiTile title="Vencidos" value={metricas?.vencidos ?? 0} icon={FileWarning} variant="danger" subtitle="Requieren atención" />
              <KpiTile title="Próximos a vencer" value={metricas?.proximos_vencer ?? 0} icon={Clock} variant="warning" subtitle="En los próximos 7 días" />
              <KpiTile title="Índice cierre" value={`${cumplimiento}%`} icon={Target} variant={cumplimiento >= 70 ? 'success' : 'danger'} subtitle={`${cerradas} de ${total} cerrados`} />
            </div>

            {/* Secondary KPIs */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <KpiTile title="Evidencias pendientes" value={metricas?.evidencias_pendientes ?? 0} icon={Upload} />
              <KpiTile title="En validación" value={metricas?.pendientes_validacion ?? 0} icon={Shield} variant="info" />
              <KpiTile title="Con prórroga" value={metricas?.con_prorroga ?? 0} icon={Calendar} />
              <KpiTile title="Mis actividades" value={metricas?.mis_actividades ?? 0} icon={Activity} />
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Semáforo de Riesgo */}
              <EnhancedDonutCard
                title="Semáforo de Riesgo"
                description="Estado de cumplimiento por fecha"
                data={porSemaforo}
                centerLabel={total.toString()}
                centerSubLabel="Total"
              />
              <EnhancedDonutCard
                title="Estado de Hallazgos"
                description="Distribución por estado"
                data={porEstado}
                centerLabel={total.toString()}
                centerSubLabel="Hallazgos"
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

            {/* Tiempo promedio bar chart + Responsables críticos */}
            <div className="grid gap-4 lg:grid-cols-2">
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
                  <ChartContainer
                    config={tiempoPromedio.reduce((acc, item, i) => {
                      acc[item.name] = { label: item.name, color: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }
                      return acc
                    }, {} as Record<string, { label: string; color: string }>)}
                    className="h-[200px] w-full"
                  >
                    <BarChart data={tiempoPromedio} layout="vertical" margin={{ left: 0, right: 40 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category" dataKey="name" width={80}
                        tickLine={false} axisLine={false}
                        fontSize={11} stroke="var(--muted-foreground)"
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {tiempoPromedio.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS_HEX[i % CHART_COLORS_HEX.length]} />
                        ))}
                        <LabelList dataKey="value" position="right" className="fill-foreground text-xs font-medium" formatter={(v: unknown) => `${v ?? 0} días`} />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <ResponsablesCriticosCard responsables={responsablesCriticos} />
            </div>

            {/* Bitácora */}
            <BitacoraCard entries={bitacora} />
          </TabsContent>

          {/* ── Hallazgos Tab ────────────────────────────────────────────────── */}
          <TabsContent value="hallazgos" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por código, descripción o responsable..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">Hallazgos en Gestión</CardTitle>
                    <CardDescription className="text-xs">Hallazgos asignados a mi dependencia</CardDescription>
                  </div>
                  <Badge variant="secondary">{filteredHallazgos.length} registros</Badge>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                {filteredHallazgos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sin registros</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Código</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Descripción</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Prioridad</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Semáforo</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Estado</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Responsable</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Cierre</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {pagedHallazgos.map((h) => (
                            <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-2.5 font-mono text-[11px] text-primary whitespace-nowrap">
                                {h.codigo_del_hallazgo}
                              </td>
                              <td className="px-4 py-2.5 max-w-xs truncate text-foreground/80" title={h.descripcion}>
                                {h.descripcion}
                              </td>
                              <td className="px-4 py-2.5">
                                <Badge className={PRIORIDAD_CONFIG[h.prioridad].color}>
                                  {PRIORIDAD_CONFIG[h.prioridad].label}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5">{semaforoBadge(h.dias_restantes)}</td>
                              <td className="px-4 py-2.5">{estadoBadge(h.estado)}</td>
                              <td className="px-4 py-2.5 text-muted-foreground">{h.responsable_plan_accion ?? '—'}</td>
                              <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                                {h.fecha_cierre_proyectada ? formatDateTime(h.fecha_cierre_proyectada) : '—'}
                              </td>
                              <td className="px-4 py-2.5">
                                <DropdownMenu>
                                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" />}>
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem><Eye className="h-3.5 w-3.5 mr-2" />Ver detalle</DropdownMenuItem>
                                    <DropdownMenuItem><Edit3 className="h-3.5 w-3.5 mr-2" />Editar plan</DropdownMenuItem>
                                    <DropdownMenuItem><Upload className="h-3.5 w-3.5 mr-2" />Subir evidencia</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem><Play className="h-3.5 w-3.5 mr-2" />Cambiar estado</DropdownMenuItem>
                                    <DropdownMenuItem><Calendar className="h-3.5 w-3.5 mr-2" />Solicitar prórroga</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 pb-3">
                      <Pagination page={hPage} pages={Math.ceil(filteredHallazgos.length / PAGE_SIZE)} onChange={setHPage} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Actividades Tab ──────────────────────────────────────────────── */}
          <TabsContent value="actividades" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Actividades por Hallazgo</h3>
                <p className="text-xs text-muted-foreground">Gestione el progreso de cada plan de acción</p>
              </div>
            </div>
            <div className="space-y-3">
              {hallazgosConActividades.map((h) => (
                <HallazgoChecklistCard key={h.id} hallazgo={h} />
              ))}
            </div>
          </TabsContent>

          {/* ── Seguimiento Tab ──────────────────────────────────────────────── */}
          <TabsContent value="seguimiento" className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Alertas */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
                      <CardDescription className="text-xs">Requieren atención inmediata</CardDescription>
                    </div>
                    <Bell className="h-4 w-4 text-destructive" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {hallazgos.filter(h => h.dias_restantes < 0).map(h => (
                      <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{h.codigo_del_hallazgo} vencido</p>
                          <p className="text-xs text-muted-foreground truncate">{h.descripcion}</p>
                        </div>
                        <Button size="sm" variant="destructive">Atender</Button>
                      </div>
                    ))}
                    {hallazgos.filter(h => h.dias_restantes >= 0 && h.dias_restantes <= 7).map(h => (
                      <div key={h.id} className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{h.codigo_del_hallazgo} próximo a vencer</p>
                          <p className="text-xs text-muted-foreground">{h.dias_restantes} días restantes</p>
                        </div>
                        <Button size="sm" variant="outline">Ver</Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* SLA Status */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">Cumplimiento SLA</CardTitle>
                      <CardDescription className="text-xs">Estado de acuerdos de nivel de servicio</CardDescription>
                    </div>
                    <Timer className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Hallazgos en SLA</span>
                        <span className="font-medium">78%</span>
                      </div>
                      <Progress value={78} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Tiempo promedio de cierre</span>
                        <span className="font-medium text-green-500">18 días</span>
                      </div>
                      <p className="text-xs text-muted-foreground">SLA objetivo: 30 días</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-500">31</p>
                        <p className="text-[10px] text-muted-foreground">En tiempo</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-500">6</p>
                        <p className="text-[10px] text-muted-foreground">En riesgo</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-destructive">4</p>
                        <p className="text-[10px] text-muted-foreground">Fuera de SLA</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Responsables críticos + Bitácora */}
            <div className="grid gap-4 lg:grid-cols-2">
              <ResponsablesCriticosCard responsables={responsablesCriticos} />
              <BitacoraCard entries={bitacora} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
