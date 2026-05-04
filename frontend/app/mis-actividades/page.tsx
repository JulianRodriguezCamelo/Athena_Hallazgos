'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  ClipboardList,
  Target,
} from 'lucide-react'
import { actividadesApi } from '@/lib/api'
import { ChecklistSection } from '@/components/organisms/hallazgos/ChecklistSection'
import { NotasMensualesInline } from '@/components/organisms/hallazgos/NotasMensualesInline'
import { useAuth } from '@/lib/auth'
import { cn, formatDateTime } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/molecules/Pagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActividadItem {
  id: number
  descripcion: string | null
  estado_accion: string | null
  responsable_accion: string | null
  fecha_compromiso: string | null
  orden: number
}

interface HallazgoChecklist {
  id: number
  codigo_del_hallazgo: string
  descripcion: string
  estado: string
  dependencia_reporta_ero: string | null
  vicepresidencia: string | null
  fecha_cierre_proyectada: string | null
  dias_restantes: number | null
  total_actividades: number
  actividades_completadas: number
  progreso: number
  actividades: ActividadItem[]
}

interface ChecklistResponse {
  hallazgos: HallazgoChecklist[]
  total: number
  pages: number
  page: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isCompletada(estado: string | null): boolean {
  if (!estado) return false
  const lower = estado.toLowerCase()
  return lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')
}

function diasLabel(dias: number | null) {
  if (dias === null) return { text: 'Sin fecha', color: 'text-muted-foreground', bg: 'bg-muted/40' }
  if (dias < 0) return { text: `Vencido hace ${Math.abs(dias)} días`, color: 'text-destructive', bg: 'bg-destructive/10' }
  if (dias === 0) return { text: 'Vence hoy', color: 'text-amber-600', bg: 'bg-amber-500/10' }
  if (dias <= 7) return { text: `${dias} días restantes`, color: 'text-amber-600', bg: 'bg-amber-500/10' }
  if (dias <= 30) return { text: `${dias} días restantes`, color: 'text-blue-600', bg: 'bg-blue-500/10' }
  return { text: `${dias} días restantes`, color: 'text-green-600', bg: 'bg-green-500/10' }
}

function progresoColor(pct: number) {
  if (pct >= 80) return 'text-green-600'
  if (pct >= 40) return 'text-amber-600'
  return 'text-destructive'
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, variant = 'default' }: {
  label: string; value: string | number; sub?: string
  variant?: 'default' | 'danger' | 'warning' | 'success'
}) {
  const colors = {
    default: 'text-foreground',
    danger: 'text-destructive',
    warning: 'text-amber-600',
    success: 'text-green-600',
  }
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className={cn('text-2xl font-bold mt-0.5', colors[variant])}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

// ─── Actividad Row ────────────────────────────────────────────────────────────
function ActividadRow({
  actividad,
  onToggle,
  updating,
}: {
  actividad: ActividadItem
  onToggle: (id: number, completed: boolean) => void
  updating: boolean
}) {
  const done = isCompletada(actividad.estado_accion)
  const [open, setOpen] = useState(false)

  const fechaLabel = actividad.fecha_compromiso
    ? (() => {
        const days = Math.round(
          (new Date(actividad.fecha_compromiso).getTime() - Date.now()) / 86_400_000
        )
        if (days < 0) return { text: `Vencida hace ${Math.abs(days)}d`, color: 'text-destructive' }
        if (days === 0) return { text: 'Vence hoy', color: 'text-amber-600' }
        if (days <= 7) return { text: `${days}d restantes`, color: 'text-amber-600' }
        return { text: `${days}d restantes`, color: 'text-muted-foreground' }
      })()
    : null

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden transition-all',
      done && 'bg-green-500/5 border-green-500/20',
      !done && 'bg-muted/20 border-border',
    )}>
      {/* Summary row */}
      <div className="flex items-start gap-3 p-3">
        {/* Toggle completion */}
        <button
          type="button"
          onClick={() => onToggle(actividad.id, !done)}
          disabled={updating}
          className={cn('mt-0.5 shrink-0 transition-opacity', updating && 'opacity-50 cursor-not-allowed')}
          aria-label={done ? 'Marcar pendiente' : 'Marcar completada'}
        >
          {updating ? (
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : done ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium leading-snug', done && 'line-through text-muted-foreground')}>
            {actividad.descripcion ?? 'Sin descripción'}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {actividad.estado_accion && (
              <Badge
                variant="outline"
                className={cn('text-[10px]', done && 'border-green-500/30 text-green-600')}
              >
                {actividad.estado_accion}
              </Badge>
            )}
            {actividad.responsable_accion && (
              <span className="text-[10px] text-muted-foreground">{actividad.responsable_accion}</span>
            )}
            {fechaLabel && (
              <span className={cn('text-[10px] flex items-center gap-1', fechaLabel.color)}>
                <Calendar className="h-3 w-3" />
                {formatDateTime(actividad.fecha_compromiso!)}
                <span className="ml-1">({fechaLabel.text})</span>
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Ver evidencias y notas"
        >
          {open
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Expandable: checklist + notes */}
      {open && (
        <div className="border-t border-border/50 px-4 py-4 space-y-5 bg-background/60">
          <ChecklistSection actividadId={actividad.id} />
          <NotasMensualesInline actividadId={actividad.id} />
        </div>
      )}
    </div>
  )
}

// ─── Hallazgo Card ────────────────────────────────────────────────────────────
function HallazgoCard({
  hallazgo,
  onToggleActividad,
  updatingIds,
}: {
  hallazgo: HallazgoChecklist
  onToggleActividad: (actId: number, completed: boolean) => void
  updatingIds: Set<number>
}) {
  const [open, setOpen] = useState(false)
  const dl = diasLabel(hallazgo.dias_restantes)

  return (
    <Card className="overflow-hidden">
      {/* Header / summary row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left: code + description */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Progress circle label */}
            <div className={cn(
              'h-12 w-12 rounded-full flex flex-col items-center justify-center text-xs font-bold shrink-0 border-2',
              hallazgo.progreso === 100
                ? 'border-green-500 bg-green-500/10 text-green-600'
                : hallazgo.progreso >= 50
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                  : 'border-destructive/60 bg-destructive/5 text-destructive',
            )}>
              {hallazgo.progreso}%
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">
                  {hallazgo.codigo_del_hallazgo}
                </span>
                <Badge variant="outline" className="text-[10px]">{hallazgo.estado}</Badge>
                {(hallazgo.dependencia_reporta_ero || hallazgo.vicepresidencia) && (
                  <span className="text-[10px] text-muted-foreground">
                    {hallazgo.dependencia_reporta_ero ?? hallazgo.vicepresidencia}
                  </span>
                )}
              </div>
              <p
                className="text-sm text-muted-foreground truncate mt-0.5 max-w-lg"
                title={hallazgo.descripcion}
              >
                {hallazgo.descripcion}
              </p>
            </div>
          </div>

          {/* Right: days + activities count */}
          <div className="flex items-center gap-4 shrink-0">
            <div className={cn('hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', dl.bg, dl.color)}>
              <Clock className="h-3 w-3" />
              {dl.text}
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs text-muted-foreground">Actividades</p>
              <p className="text-sm font-bold">
                {hallazgo.actividades_completadas}/{hallazgo.total_actividades}
              </p>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', open && 'rotate-180')} />
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={hallazgo.progreso} className="mt-3 h-1.5" />

        {/* Mobile: days label */}
        <div className={cn('sm:hidden mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', dl.bg, dl.color)}>
          <Clock className="h-3 w-3" />
          {dl.text}
        </div>
      </button>

      {/* Actividades checklist */}
      {open && (
        <>
          <Separator />
          <CardContent className="p-4">
            {hallazgo.actividades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin actividades registradas</p>
            ) : (
              <div className="space-y-2">
                {hallazgo.actividades.map((act) => (
                  <ActividadRow
                    key={act.id}
                    actividad={act}
                    onToggle={onToggleActividad}
                    updating={updatingIds.has(act.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MisActividadesPage() {
  const pathname = usePathname()
  const { user, isDirectivo, isProfesional, isGestor } = useAuth()

  const [data, setData] = useState<ChecklistResponse | null>(null)
  // Local copy of hallazgos so we can update progreso optimistically
  const [hallazgos, setHallazgos] = useState<HallazgoChecklist[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set())

  const prevState = useRef<Map<number, string | null>>(new Map())

  const load = useCallback(async (p: number, refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await actividadesApi.checklist(p)
      const d = res.data as ChecklistResponse
      setData(d)
      setHallazgos(d.hallazgos)
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load(1) }, [load])

  const handlePageChange = (p: number) => {
    setPage(p)
    load(p)
  }

  const handleToggleActividad = useCallback(async (actId: number, completed: boolean) => {
    const newEstado = completed ? 'Cumplido' : 'Pendiente'

    // Find the current estado for rollback
    let currentEstado: string | null = null
    setHallazgos((prev) =>
      prev.map((h) => {
        const idx = h.actividades.findIndex((a) => a.id === actId)
        if (idx === -1) return h
        currentEstado = h.actividades[idx].estado_accion
        const newActs = h.actividades.map((a) =>
          a.id === actId ? { ...a, estado_accion: newEstado } : a
        )
        const completadas = newActs.filter((a) => isCompletada(a.estado_accion)).length
        const total = newActs.length
        return {
          ...h,
          actividades: newActs,
          actividades_completadas: completadas,
          progreso: total > 0 ? Math.round((completadas / total) * 100) : 0,
        }
      })
    )

    prevState.current.set(actId, currentEstado)
    setUpdatingIds((s) => new Set(s).add(actId))

    try {
      await actividadesApi.updateEstado(actId, newEstado)
    } catch {
      // Revert
      const original = prevState.current.get(actId) ?? null
      setHallazgos((prev) =>
        prev.map((h) => {
          const idx = h.actividades.findIndex((a) => a.id === actId)
          if (idx === -1) return h
          const newActs = h.actividades.map((a) =>
            a.id === actId ? { ...a, estado_accion: original } : a
          )
          const completadas = newActs.filter((a) => isCompletada(a.estado_accion)).length
          const total = newActs.length
          return {
            ...h,
            actividades: newActs,
            actividades_completadas: completadas,
            progreso: total > 0 ? Math.round((completadas / total) * 100) : 0,
          }
        })
      )
    } finally {
      setUpdatingIds((s) => {
        const next = new Set(s)
        next.delete(actId)
        return next
      })
      prevState.current.delete(actId)
    }
  }, [])

  // ── Derived KPIs ─────────────────────────────────────────────────────────────
  const kpiTotal = data?.total ?? 0
  const kpiVencidos = hallazgos.filter((h) => h.dias_restantes !== null && h.dias_restantes < 0).length
  const kpiProximos = hallazgos.filter((h) => h.dias_restantes !== null && h.dias_restantes >= 0 && h.dias_restantes <= 7).length
  const kpiProgreso = hallazgos.length > 0
    ? Math.round(hallazgos.reduce((acc, h) => acc + h.progreso, 0) / hallazgos.length)
    : 0

  if (!isDirectivo && !isProfesional && !isGestor) {
    return (
      <DashboardShell pathname={pathname}>
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          No tiene permisos para ver esta página.
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-6">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Mis Actividades</h2>
              <p className="text-sm text-muted-foreground">
                {user?.nombre} · Seguimiento de fechas y progreso
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 self-start sm:self-auto"
            onClick={() => load(page, true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Actualizar
          </Button>
        </div>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <KpiTile label="Total hallazgos" value={kpiTotal} sub="en esta página y otras" />
          <KpiTile label="Vencidos" value={kpiVencidos} variant="danger" sub="fecha superada" />
          <KpiTile label="Próximos a vencer" value={kpiProximos} variant="warning" sub="en los próximos 7 días" />
          <KpiTile
            label="Progreso promedio"
            value={`${kpiProgreso}%`}
            variant={kpiProgreso >= 70 ? 'success' : kpiProgreso >= 40 ? 'warning' : 'danger'}
            sub="actividades completadas"
          />
        </div>

        {/* ── List ─────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <RefreshCw className="animate-spin w-5 h-5 mr-2" />
            Cargando…
          </div>
        ) : hallazgos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Target className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No tiene hallazgos asignados</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {hallazgos.length} hallazgo{hallazgos.length !== 1 ? 's' : ''} · haz clic para ver actividades
              </p>
              {data && data.total > hallazgos.length && (
                <Badge variant="secondary">{data.total} en total</Badge>
              )}
            </div>

            <div className="space-y-3">
              {hallazgos.map((h) => (
                <HallazgoCard
                  key={h.id}
                  hallazgo={h}
                  onToggleActividad={handleToggleActividad}
                  updatingIds={updatingIds}
                />
              ))}
            </div>

            {data && (
              <Pagination page={page} pages={data.pages} onChange={handlePageChange} />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  )
}
