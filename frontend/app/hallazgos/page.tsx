'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  Search, X, Eye, ChevronDown, ChevronUp,
  FileSpreadsheet, AlertTriangle, Clock, Calendar, Upload,
} from 'lucide-react'
import { hallazgosApi, uploadsApi } from '@/lib/api'
import { formatDate, getEstadoColor, cn } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Select from '@/components/ui/Select'
import { Separator } from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Hallazgo {
  id: number
  codigo_del_hallazgo: string | null
  descripcion: string | null
  fecha_inicial_evento: string | null
  fecha_cierre_proyectada: string | null
  dependencia_reporta_ero: string | null
  estado: string | null
  reportado_por: string | null
  responsable_plan_accion: string | null
  estado_plan_accion: string | null
  prorroga: string | null
  id_plan_accion: string | null
  nombre_plan_accion: string | null
  descripcion_plan_accion: string | null
  observaciones: string | null
  aplicativo_afecta_ero: string | null
  fecha_finalizacion_evento: string | null
  reportado_para: string | null
  estado_accion: string | null
  responsable_accion: string | null
  fecha_cierre_final_prorroga: string | null
  vinculado_via_actividad?: boolean
}

interface Actividad {
  id: number
  id_plan_accion: string | null
  nombre_plan_accion: string | null
  descripcion: string | null
  estado_plan_accion: string | null
  responsable: string | null
  estado_accion: string | null
  responsable_accion: string | null
  fecha_compromiso: string | null
  prorroga: string | null
  fecha_prorroga: string | null
  observaciones: string | null
}

interface Meta { total: number; pages: number; page: number }

interface AnalysisResult {
  total: number
  total_actividades: number
  vencidos: number
  con_prorroga: number
  por_estado: { estado: string; total: number }[]
  por_dependencia: { nombre: string; total: number }[]
  por_responsable: { nombre: string; total: number }[]
  errores: string[]
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getEstadoColor(value))}>
      {value}
    </span>
  )
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value ?? '—'}</p>
    </div>
  )
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-36 truncate text-muted-foreground shrink-0" title={label}>{label}</span>
      <div className="flex-1 bg-muted rounded-full h-1.5 min-w-0">
        <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right font-semibold text-foreground shrink-0">{value}</span>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className={cn(
      'rounded-lg border p-3 text-center',
      color === 'red' ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
        : color === 'amber' ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20'
        : 'border-border bg-muted/30'
    )}>
      <p className={cn(
        'text-2xl font-bold',
        color === 'red' ? 'text-red-600 dark:text-red-400'
          : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
          : 'text-foreground'
      )}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

// ─── ActividadesTab ───────────────────────────────────────────────────────────

function ActividadesTab({ hallazgoId }: { hallazgoId: number }) {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hallazgosApi.actividades(hallazgoId)
      .then((r) => {
        const d = r.data as { actividades: Actividad[] }
        setActividades(d.actividades)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [hallazgoId])

  if (loading) return <div className="py-6 text-center text-sm text-muted-foreground">Cargando actividades…</div>
  if (actividades.length === 0) return (
    <div className="py-8 text-center text-sm text-muted-foreground">
      No hay actividades registradas para este hallazgo.
    </div>
  )

  return (
    <div className="space-y-3">
      {actividades.map((act, idx) => (
        <div key={act.id} className="rounded-xl border border-border bg-card overflow-hidden">

          {/* Cabecera: número + título + estado */}
          <div className="flex items-start gap-3 px-4 py-3 bg-muted/30 border-b border-border/60">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">
                {act.nombre_plan_accion ?? act.descripcion ?? '—'}
              </p>
              {act.id_plan_accion && (
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{act.id_plan_accion}</p>
              )}
            </div>
            {act.estado_plan_accion && (
              <div className="shrink-0 mt-0.5">
                <StatusBadge value={act.estado_plan_accion} />
              </div>
            )}
          </div>

          {/* Campos: solo los que tienen valor */}
          <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3">
            {act.responsable         && <DetailField label="Responsable plan"   value={act.responsable} />}
            {act.estado_accion       && <DetailField label="Estado acción"       value={act.estado_accion} />}
            {act.responsable_accion  && <DetailField label="Responsable acción"  value={act.responsable_accion} />}
            {act.fecha_compromiso    && <DetailField label="Fecha compromiso"    value={formatDate(act.fecha_compromiso)} />}
            {act.prorroga            && <DetailField label="Prórroga"            value={act.prorroga} />}
            {act.fecha_prorroga      && <DetailField label="Fecha prórroga"      value={formatDate(act.fecha_prorroga)} />}
          </div>

          {/* Descripción (si es diferente al título) */}
          {act.descripcion && act.descripcion !== act.nombre_plan_accion && (
            <div className="px-4 pb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Descripción</p>
              <p className="text-sm text-foreground bg-muted/40 rounded-lg p-3 leading-relaxed">{act.descripcion}</p>
            </div>
          )}

          {act.observaciones && (
            <div className="px-4 pb-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observaciones</p>
              <p className="text-sm text-foreground bg-muted/40 rounded-lg p-3 leading-relaxed">{act.observaciones}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── ExcelAnalyzer ────────────────────────────────────────────────────────────

function ExcelAnalyzer({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const analyze = async (file: File) => {
    setAnalyzing(true)
    setResult(null)
    setError(null)
    setFileName(file.name)
    try {
      const res = await uploadsApi.analyze(file)
      setResult(res.data as AnalysisResult)
    } catch (e: unknown) {
      const err = e as { message?: string }
      setError(err?.message ?? 'Error al analizar el archivo')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) analyze(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) analyze(file)
  }

  const reset = () => {
    setResult(null)
    setError(null)
    setFileName(null)
    setShowErrors(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const maxDep = result ? Math.max(...result.por_dependencia.map(d => d.total), 1) : 1
  const maxResp = result ? Math.max(...result.por_responsable.map(r => r.total), 1) : 1
  const maxEst = result ? Math.max(...result.por_estado.map(e => e.total), 1) : 1

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Analizador de Excel</span>
            {fileName && !analyzing && (
              <span className="text-xs text-muted-foreground">— {fileName}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <Button variant="ghost" size="sm" onClick={reset} className="text-xs h-7">
                <Upload className="w-3 h-3 mr-1" />
                Nuevo archivo
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="w-7 h-7">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Drop zone (shown when no result) */}
        {!result && !analyzing && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleChange}
            />
            <FileSpreadsheet className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              Arrastra un archivo Excel aquí
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              o haz clic para seleccionar · .xlsx / .xls
            </p>
          </div>
        )}

        {/* Loading */}
        {analyzing && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Analizando archivo…</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Error al procesar el archivo</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-5">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Hallazgos" value={result.total} />
              <StatCard label="Actividades" value={result.total_actividades} />
              <StatCard label="Vencidos" value={result.vencidos} color="red" />
              <StatCard label="Con prórroga" value={result.con_prorroga} color="amber" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Por estado */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Por estado</p>
                <div className="space-y-1.5">
                  {result.por_estado.map(e => (
                    <BarRow key={e.estado} label={e.estado} value={e.total} max={maxEst} />
                  ))}
                </div>
              </div>

              {/* Por dependencia */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Top dependencias</p>
                <div className="space-y-1.5">
                  {result.por_dependencia.map(d => (
                    <BarRow key={d.nombre} label={d.nombre} value={d.total} max={maxDep} />
                  ))}
                </div>
              </div>

              {/* Por responsable */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Top responsables</p>
                <div className="space-y-1.5">
                  {result.por_responsable.map(r => (
                    <BarRow key={r.nombre} label={r.nombre} value={r.total} max={maxResp} />
                  ))}
                </div>
              </div>
            </div>

            {/* Errors */}
            {result.errores.length > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 overflow-hidden">
                <button
                  onClick={() => setShowErrors(!showErrors)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 text-left"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {result.errores.length} error{result.errores.length !== 1 ? 'es' : ''} de parseo
                    </span>
                  </div>
                  {showErrors
                    ? <ChevronUp className="w-3.5 h-3.5 text-amber-500" />
                    : <ChevronDown className="w-3.5 h-3.5 text-amber-500" />}
                </button>
                {showErrors && (
                  <div className="p-3 space-y-1">
                    {result.errores.map((e, i) => (
                      <p key={i} className="text-xs text-muted-foreground font-mono">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HallazgosPage() {
  const pathname = usePathname()

  // Table state
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, pages: 1, page: 1 })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Hallazgo | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'actividades'>('info')

  // Filters
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [dependencia, setDependencia] = useState('')
  const [vicepresidencia, setVicepresidencia] = useState('')
  const [responsable, setResponsable] = useState('')
  const [estadoPlan, setEstadoPlan] = useState('')
  const [vencido, setVencido] = useState(false)
  const [conProrroga, setConProrroga] = useState(false)
  const [fechaCierreDesde, setFechaCierreDesde] = useState('')
  const [fechaCierreHasta, setFechaCierreHasta] = useState('')

  // Options
  const [estados, setEstados] = useState<string[]>([])
  const [dependencias, setDependencias] = useState<string[]>([])
  const [vicepresidencias, setVicepresidencias] = useState<string[]>([])
  const [responsables, setResponsables] = useState<string[]>([])
  const [estadosPlan, setEstadosPlan] = useState<string[]>([])
  const [page, setPage] = useState(1)

  // Analyzer
  const [showAnalyzer, setShowAnalyzer] = useState(false)

  const clearAll = () => {
    setSearch(''); setEstado(''); setDependencia(''); setVicepresidencia('')
    setResponsable(''); setEstadoPlan(''); setVencido(false); setConProrroga(false)
    setFechaCierreDesde(''); setFechaCierreHasta('')
  }

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await hallazgosApi.list({
        page: p,
        per_page: 15,
        ...(search && { search }),
        ...(estado && { estado }),
        ...(dependencia && { dependencia }),
        ...(vicepresidencia && { vicepresidencia }),
        ...(responsable && { responsable }),
        ...(estadoPlan && { estado_plan_accion: estadoPlan }),
        ...(vencido && { vencido: 'true' }),
        ...(conProrroga && { con_prorroga: 'true' }),
        ...(fechaCierreDesde && { fecha_cierre_desde: fechaCierreDesde }),
        ...(fechaCierreHasta && { fecha_cierre_hasta: fechaCierreHasta }),
      })
      const d = res.data as {
        hallazgos: Hallazgo[]
        total: number
        pages: number
        page: number
      }
      setHallazgos(d.hallazgos)
      setMeta({ total: d.total, pages: d.pages, page: d.page })
    } finally {
      setLoading(false)
    }
  }, [search, estado, dependencia, vicepresidencia, responsable, estadoPlan, vencido, conProrroga, fechaCierreDesde, fechaCierreHasta])

  useEffect(() => {
    hallazgosApi.estados().then((r) => setEstados((r.data as { estados: string[] }).estados)).catch(() => {})
    hallazgosApi.dependencias().then((r) => setDependencias((r.data as { dependencias: string[] }).dependencias)).catch(() => {})
    hallazgosApi.vicepresidencias().then((r) => setVicepresidencias((r.data as { vicepresidencias: string[] }).vicepresidencias)).catch(() => {})
    hallazgosApi.responsables().then((r) => setResponsables((r.data as { responsables: string[] }).responsables)).catch(() => {})
    hallazgosApi.estadosPlan().then((r) => setEstadosPlan((r.data as { estados_plan_accion: string[] }).estados_plan_accion)).catch(() => {})
  }, [])

  useEffect(() => { load(page) }, [page]) // eslint-disable-line
  useEffect(() => { setPage(1); load(1) }, [search, estado, dependencia, vicepresidencia, responsable, estadoPlan, vencido, conProrroga, fechaCierreDesde, fechaCierreHasta]) // eslint-disable-line

  const hasFilters = !!search || !!estado || !!dependencia || !!vicepresidencia || !!responsable || !!estadoPlan || vencido || conProrroga || !!fechaCierreDesde || !!fechaCierreHasta

  const estadoOptions = estados.map((e) => ({ value: e, label: e }))
  const depOptions = dependencias.map((d) => ({ value: d, label: d }))
  const vpOptions = vicepresidencias.map((v) => ({ value: v, label: v }))
  const respOptions = responsables.map((r) => ({ value: r, label: r }))
  const estadoPlanOptions = estadosPlan.map((e) => ({ value: e, label: e }))

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-3">

        {/* ── Toolbar ─────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-4 space-y-3">

            {/* Row 1: Search + main selects + analyzer button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por código, descripción…"
                  className="pl-9"
                />
              </div>

              <div className="min-w-40">
                <Select value={estado} onChange={(e) => setEstado(e.target.value)} options={estadoOptions} placeholder="Estado" />
              </div>

              <div className="min-w-44">
                <Select value={dependencia} onChange={(e) => setDependencia(e.target.value)} options={depOptions} placeholder="Dependencia" />
              </div>

              {vicepresidencias.length > 0 && (
                <div className="min-w-44">
                  <Select value={vicepresidencia} onChange={(e) => setVicepresidencia(e.target.value)} options={vpOptions} placeholder="Vicepresidencia" />
                </div>
              )}

              <div className="min-w-44">
                <Select value={estadoPlan} onChange={(e) => setEstadoPlan(e.target.value)} options={estadoPlanOptions} placeholder="Estado plan" />
              </div>

              <Button
                variant={showAnalyzer ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowAnalyzer(!showAnalyzer)}
                className="ml-auto shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
                Analizar Excel
              </Button>
            </div>

            {/* Row 2: Responsable + quick filters + date range */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-52">
                <Select value={responsable} onChange={(e) => setResponsable(e.target.value)} options={respOptions} placeholder="Responsable" />
              </div>

              <div className="w-px h-5 bg-border mx-1 shrink-0" />

              {/* Quick pills */}
              <button
                onClick={() => setVencido(!vencido)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0',
                  vencido
                    ? 'bg-red-500/10 border-red-400/40 text-red-600 dark:text-red-400'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <AlertTriangle className="w-3 h-3" />
                Vencidos
              </button>

              <button
                onClick={() => setConProrroga(!conProrroga)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0',
                  conProrroga
                    ? 'bg-amber-500/10 border-amber-400/40 text-amber-600 dark:text-amber-400'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Clock className="w-3 h-3" />
                Con prórroga
              </button>

              <div className="w-px h-5 bg-border mx-1 shrink-0" />

              {/* Date range */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground shrink-0">Cierre:</span>
                <input
                  type="date"
                  value={fechaCierreDesde}
                  onChange={(e) => setFechaCierreDesde(e.target.value)}
                  className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <span className="text-xs text-muted-foreground shrink-0">→</span>
                <input
                  type="date"
                  value={fechaCierreHasta}
                  onChange={(e) => setFechaCierreHasta(e.target.value)}
                  className="h-8 px-2 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="ml-auto flex items-center gap-2 shrink-0">
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
                    <X className="w-3 h-3 mr-1" />
                    Limpiar
                  </Button>
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {meta.total} registro{meta.total !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Row 3: Active filter chips */}
            {hasFilters && (
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/60">
                {estado && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                    Estado: {estado}
                    <button onClick={() => setEstado('')} className="hover:text-foreground text-muted-foreground ml-0.5"><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {dependencia && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                    {dependencia.length > 24 ? dependencia.slice(0, 24) + '…' : dependencia}
                    <button onClick={() => setDependencia('')} className="hover:text-foreground text-muted-foreground ml-0.5"><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {vicepresidencia && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                    VP: {vicepresidencia.length > 20 ? vicepresidencia.slice(0, 20) + '…' : vicepresidencia}
                    <button onClick={() => setVicepresidencia('')} className="hover:text-foreground text-muted-foreground ml-0.5"><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {responsable && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                    {responsable.length > 20 ? responsable.slice(0, 20) + '…' : responsable}
                    <button onClick={() => setResponsable('')} className="hover:text-foreground text-muted-foreground ml-0.5"><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {estadoPlan && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                    Plan: {estadoPlan}
                    <button onClick={() => setEstadoPlan('')} className="hover:text-foreground text-muted-foreground ml-0.5"><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {vencido && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-medium">
                    Vencidos
                    <button onClick={() => setVencido(false)} className="hover:opacity-70 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {conProrroga && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                    Con prórroga
                    <button onClick={() => setConProrroga(false)} className="hover:opacity-70 ml-0.5"><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {(fechaCierreDesde || fechaCierreHasta) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                    Cierre: {fechaCierreDesde || '…'} → {fechaCierreHasta || '…'}
                    <button onClick={() => { setFechaCierreDesde(''); setFechaCierreHasta('') }} className="hover:text-foreground text-muted-foreground ml-0.5"><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Excel Analyzer ──────────────────────────────────────── */}
        {showAnalyzer && (
          <ExcelAnalyzer onClose={() => setShowAnalyzer(false)} />
        )}

        {/* ── Table ───────────────────────────────────────────────── */}
        <Card className="overflow-hidden">
          {loading ? (
            <PageLoader />
          ) : hallazgos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-sm">No se encontraron hallazgos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    {['Código', 'Descripción', 'Dependencia', 'Estado',
                      'F. Inicial', 'F. Cierre Proy.', 'Responsable', 'Estado Plan', ''].map((h) => (
                      <TableHead key={h} className="text-primary-foreground font-semibold text-xs whitespace-nowrap py-3">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hallazgos.map((h) => (
                    <TableRow key={h.id} className="group">
                      <TableCell className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
                        {h.codigo_del_hallazgo ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-foreground text-sm" title={h.descripcion ?? ''}>
                          {h.descripcion ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-xs max-w-[120px]">
                        <p className="truncate" title={h.dependencia_reporta_ero ?? ''}>
                          {h.dependencia_reporta_ero ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge value={h.estado} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                        {formatDate(h.fecha_inicial_evento)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                        {formatDate(h.fecha_cierre_proyectada)}
                      </TableCell>
                      <TableCell className="max-w-[140px]">
                        <p className="truncate text-muted-foreground text-xs" title={h.responsable_plan_accion ?? ''}>
                          {h.responsable_plan_accion ?? '—'}
                        </p>
                        {h.vinculado_via_actividad && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 leading-none">
                            vía act.
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <StatusBadge value={h.estado_plan_accion} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelected(h); setActiveTab('info') }}
                          className="opacity-0 group-hover:opacity-100 w-7 h-7 text-primary hover:bg-primary/10"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {meta.pages > 1 && (
            <>
              <Separator />
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Página {meta.page} de {meta.pages}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-7 h-7"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    ‹
                  </Button>
                  {(() => {
                    const window = 2
                    let start = Math.max(1, page - window)
                    let end = Math.min(meta.pages, page + window)
                    if (end - start < window * 2) {
                      if (start === 1) end = Math.min(meta.pages, start + window * 2)
                      else start = Math.max(1, end - window * 2)
                    }
                    const pages: (number | '...')[] = []
                    if (start > 1) { pages.push(1); if (start > 2) pages.push('...') }
                    for (let p = start; p <= end; p++) pages.push(p)
                    if (end < meta.pages) { if (end < meta.pages - 1) pages.push('...'); pages.push(meta.pages) }
                    return pages.map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === page ? 'default' : 'ghost'}
                          size="icon"
                          className="w-7 h-7 text-xs"
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      )
                    )
                  })()}
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-7 h-7"
                    disabled={page >= meta.pages}
                    onClick={() => setPage(page + 1)}
                  >
                    ›
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Hallazgo ${selected?.codigo_del_hallazgo ?? ''}`}
        size="2xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('info')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'info'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Información
              </button>
              <button
                onClick={() => setActiveTab('actividades')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'actividades'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Actividades
              </button>
            </div>

            {activeTab === 'info' && (
              <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Descripción
                  </p>
                  <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">
                    {selected.descripcion ?? '—'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <DetailField label="Código del evento"       value={selected.codigo_del_hallazgo} />
                  <DetailField label="Estado"                  value={selected.estado} />
                  <DetailField label="Dependencia ERO"         value={selected.dependencia_reporta_ero} />
                  <DetailField label="Reportado para"          value={selected.reportado_para} />
                  <DetailField label="Reportado por"           value={selected.reportado_por} />
                  <DetailField label="Aplicativo afecta ERO"   value={selected.aplicativo_afecta_ero} />
                  <DetailField label="Fecha inicial"           value={formatDate(selected.fecha_inicial_evento)} />
                  <DetailField label="Fecha finalización"      value={formatDate(selected.fecha_finalizacion_evento)} />
                  <DetailField label="Fecha cierre proyectada" value={formatDate(selected.fecha_cierre_proyectada)} />
                  <DetailField label="Prórroga"                value={selected.prorroga} />
                  <DetailField label="Fecha cierre prórroga"   value={formatDate(selected.fecha_cierre_final_prorroga)} />
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2.5 border-b border-border">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                      Plan de acción principal
                    </p>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-4">
                    <DetailField label="ID Plan"            value={selected.id_plan_accion} />
                    <DetailField label="Estado plan"        value={selected.estado_plan_accion} />
                    <DetailField label="Responsable plan"   value={selected.responsable_plan_accion} />
                    <DetailField label="Estado acción"      value={selected.estado_accion} />
                    <DetailField label="Responsable acción" value={selected.responsable_accion} />
                    <DetailField label="Nombre del plan"    value={selected.nombre_plan_accion} />
                  </div>
                  {selected.descripcion_plan_accion && (
                    <div className="px-4 pb-4">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Descripción del plan
                      </p>
                      <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">
                        {selected.descripcion_plan_accion}
                      </p>
                    </div>
                  )}
                </div>

                {selected.observaciones && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Observaciones
                    </p>
                    <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">
                      {selected.observaciones}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'actividades' && (
              <div className="max-h-[65vh] overflow-y-auto pr-1">
                <ActividadesTab hallazgoId={selected.id} />
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardShell>
  )
}
