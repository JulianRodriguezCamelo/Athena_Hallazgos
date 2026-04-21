'use client'

import { useEffect, useState, useCallback, useRef, type ElementType } from 'react'
import { usePathname } from 'next/navigation'
import {
  Search, X, Eye, ChevronDown, ChevronUp,
  FileSpreadsheet, AlertTriangle, Clock, Calendar, Upload,
  SlidersHorizontal, ListChecks, ClipboardList,
  User, Building2, XCircle, RotateCcw,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { formatDate, getEstadoColor, cn } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Select from '@/components/ui/Select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/Badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { hallazgosApi, actividadesApi, uploadsApi } from '@/lib/api'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Hallazgo {
  id: number
  codigo_del_hallazgo: string | null
  descripcion: string | null
  fecha_inicial_evento: string | null
  fecha_cierre_proyectada: string | null
  dependencia_reporta_ero: string | null
  vicepresidencia: string | null
  direccion: string | null
  estado: string | null
  reportado_por: string | null
  prorroga: string | null
  observaciones: string | null
  aplicativo_afecta_ero: string | null
  fecha_finalizacion_evento: string | null
  reportado_para: string | null
  fecha_cierre_final_prorroga: string | null
  vinculado_via_actividad?: boolean
}

interface Actividad {
  id: number
  hallazgo_id: number | null
  codigo_del_hallazgo: string | null
  orden: number | null
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
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', getEstadoColor(value))}>
      {value}
    </span>
  )
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground">{value ?? '—'}</p>
    </div>
  )
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-32 truncate text-muted-foreground shrink-0" title={label}>{label}</span>
      <div className="flex-1 bg-muted rounded-full h-2 min-w-0">
        <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-semibold text-foreground shrink-0">{value}</span>
    </div>
  )
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number; color?: string; icon?: ElementType }) {
  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all hover:shadow-md',
      color === 'red' ? 'border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 dark:border-red-900/50 dark:from-red-950/30 dark:to-red-950/10'
        : color === 'amber' ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-amber-950/10'
        : color === 'emerald' ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-emerald-950/10'
        : 'border-border bg-gradient-to-br from-muted/50 to-muted/20'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn(
            'text-3xl font-bold tracking-tight',
            color === 'red' ? 'text-red-600 dark:text-red-400'
              : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
              : color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-foreground'
          )}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
        </div>
        {Icon && (
          <div className={cn(
            'p-2 rounded-lg',
            color === 'red' ? 'bg-red-100 dark:bg-red-900/30'
              : color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30'
              : color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30'
              : 'bg-muted'
          )}>
            <Icon className={cn(
              'w-4 h-4',
              color === 'red' ? 'text-red-600 dark:text-red-400'
                : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
                : color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground'
            )} />
          </div>
        )}
      </div>
    </div>
  )
}

function FilterPill({
  label, active, onClick, variant = 'default', icon: Icon,
}: {
  label: string; active: boolean; onClick: () => void
  variant?: 'default' | 'danger' | 'warning'
  icon?: ElementType
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200',
        active
          ? variant === 'danger'
            ? 'bg-red-500/10 border-red-400/40 text-red-600 dark:text-red-400 shadow-sm'
            : variant === 'warning'
            ? 'bg-amber-500/10 border-amber-400/40 text-amber-600 dark:text-amber-400 shadow-sm'
            : 'bg-primary/10 border-primary/40 text-primary shadow-sm'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border/80'
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  )
}

// ─── ActividadesTab (for modal) ───────────────────────────────────────────────

function ActividadesModalTab({ hallazgoId }: { hallazgoId: number }) {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    hallazgosApi.actividades(hallazgoId)
      .then((res) => {
        if (cancelled) return
        const data = res.data as { actividades: Actividad[] }
        setActividades(data.actividades ?? [])
      })
      .catch(() => { if (!cancelled) setError('No se pudieron cargar las actividades') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [hallazgoId])

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Cargando actividades…</div>
  if (error) return <div className="py-8 text-center text-sm text-destructive">{error}</div>
  if (actividades.length === 0) return (
    <div className="py-12 text-center">
      <ListChecks className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">No hay actividades registradas para este hallazgo.</p>
    </div>
  )

  return (
    <div className="space-y-3">
      {actividades.map((act, idx) => (
        <div key={act.id} className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-sm">
          <div className="flex items-start gap-3 px-4 py-3 bg-muted/30 border-b border-border/60">
            <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">
                {act.descripcion ?? '—'}
              </p>
            </div>
            {act.estado_plan_accion && <StatusBadge value={act.estado_plan_accion} />}
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3">
            {act.responsable && <DetailField label="Responsable plan" value={act.responsable} />}
            {act.estado_accion && <DetailField label="Estado acción" value={act.estado_accion} />}
            {act.responsable_accion && <DetailField label="Responsable acción" value={act.responsable_accion} />}
            {act.fecha_compromiso && <DetailField label="Fecha compromiso" value={formatDate(act.fecha_compromiso)} />}
            {act.prorroga && <DetailField label="Prórroga" value={act.prorroga} />}
            {act.fecha_prorroga && <DetailField label="Fecha prórroga" value={formatDate(act.fecha_prorroga)} />}
          </div>
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
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Error al analizar el archivo'
      setError(msg)
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
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.02] to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Analizador de Excel</CardTitle>
              {fileName && !analyzing && (
                <CardDescription className="mt-0.5">{fileName}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <Button variant="outline" size="sm" onClick={reset} className="text-xs">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Nuevo archivo
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!result && !analyzing && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200',
              dragging
                ? 'border-primary bg-primary/5 scale-[1.02]'
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
            <div className="w-14 h-14 rounded-full bg-muted/80 flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Arrastra un archivo Excel aquí</p>
            <p className="text-xs text-muted-foreground mt-1.5">o haz clic para seleccionar · .xlsx / .xls</p>
          </div>
        )}

        {analyzing && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Analizando archivo…</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Error al procesar el archivo</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Hallazgos" value={result.total} icon={ClipboardList} />
              <StatCard label="Actividades" value={result.total_actividades} icon={ListChecks} />
              <StatCard label="Vencidos" value={result.vencidos} color="red" icon={XCircle} />
              <StatCard label="Con prórroga" value={result.con_prorroga} color="amber" icon={Clock} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por estado</h4>
                <div className="space-y-2">
                  {result.por_estado.map(e => (
                    <BarRow key={e.estado} label={e.estado} value={e.total} max={maxEst} />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top dependencias</h4>
                <div className="space-y-2">
                  {result.por_dependencia.map(d => (
                    <BarRow key={d.nombre} label={d.nombre} value={d.total} max={maxDep} />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top responsables</h4>
                <div className="space-y-2">
                  {result.por_responsable.map(r => (
                    <BarRow key={r.nombre} label={r.nombre} value={r.total} max={maxResp} />
                  ))}
                </div>
              </div>
            </div>

            {result.errores.length > 0 && (
              <Collapsible open={showErrors} onOpenChange={setShowErrors}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-left transition-colors hover:bg-amber-100/50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        {result.errores.length} error{result.errores.length !== 1 ? 'es' : ''} de parseo
                      </span>
                    </div>
                    {showErrors ? <ChevronUp className="w-4 h-4 text-amber-500" /> : <ChevronDown className="w-4 h-4 text-amber-500" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 rounded-lg bg-muted/50 space-y-1.5">
                    {result.errores.map((e, i) => (
                      <p key={i} className="text-xs text-muted-foreground font-mono">{e}</p>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, meta, setPage }: { page: number; meta: Meta; setPage: (p: number) => void }) {
  if (meta.pages <= 1) return null
  const windowSize = 2
  let start = Math.max(1, page - windowSize)
  let end = Math.min(meta.pages, page + windowSize)
  if (end - start < windowSize * 2) {
    if (start === 1) end = Math.min(meta.pages, start + windowSize * 2)
    else start = Math.max(1, end - windowSize * 2)
  }
  const nums: (number | '...')[] = []
  if (start > 1) { nums.push(1); if (start > 2) nums.push('...') }
  for (let p = start; p <= end; p++) nums.push(p)
  if (end < meta.pages) { if (end < meta.pages - 1) nums.push('...'); nums.push(meta.pages) }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Página <span className="font-medium text-foreground">{meta.page}</span> de{' '}
        <span className="font-medium text-foreground">{meta.pages}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="w-8 h-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        {nums.map((n, i) =>
          n === '...' ? (
            <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground">…</span>
          ) : (
            <Button key={n} variant={n === page ? 'default' : 'ghost'} size="icon" className="w-8 h-8 text-xs" onClick={() => setPage(n)}>
              {n}
            </Button>
          )
        )}
        <Button variant="outline" size="icon" className="w-8 h-8" disabled={page >= meta.pages} onClick={() => setPage(page + 1)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Combobox Filter ─────────────────────────────────────────────────────────

function ComboboxFilter({
  value, onChange, options, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(v: string) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQuery('') }}
        className={cn(
          'w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md border text-xs',
          'bg-background border-input shadow-sm hover:bg-muted/40 transition-colors',
          value ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <span className="truncate">{value || placeholder}</span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onChange(''))}
              className="hover:text-destructive rounded-full"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribir para filtrar…"
              className="w-full h-7 px-2 text-xs rounded-sm border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o}
                  onClick={() => select(o)}
                  className={cn(
                    'px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/50 truncate',
                    value === o && 'bg-primary/10 text-primary font-medium',
                  )}
                >
                  {o}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Filters Panel ────────────────────────────────────────────────────────────

interface FiltersPanelProps {
  search: string; setSearch: (v: string) => void
  estado: string; setEstado: (v: string) => void
  dependencia: string; setDependencia: (v: string) => void
  vicepresidencia: string; setVicepresidencia: (v: string) => void
  direccion: string; setDireccion: (v: string) => void
  responsable: string; setResponsable: (v: string) => void
  estadoPlan: string; setEstadoPlan: (v: string) => void
  vencido: boolean; setVencido: (v: boolean) => void
  conProrroga: boolean; setConProrroga: (v: boolean) => void
  fechaCierreDesde: string; setFechaCierreDesde: (v: string) => void
  fechaCierreHasta: string; setFechaCierreHasta: (v: string) => void
  fechaInicialDesde: string; setFechaInicialDesde: (v: string) => void
  fechaInicialHasta: string; setFechaInicialHasta: (v: string) => void
  estados: string[]; dependencias: string[]; vicepresidencias: string[]
  direcciones: string[]; responsables: string[]; estadosPlan: string[]
  hasFilters: boolean; clearAll: () => void; total: number
}

function FiltersPanel({
  search, setSearch,
  estado, setEstado,
  dependencia, setDependencia,
  vicepresidencia, setVicepresidencia,
  direccion, setDireccion,
  responsable, setResponsable,
  estadoPlan, setEstadoPlan,
  vencido, setVencido,
  conProrroga, setConProrroga,
  fechaCierreDesde, setFechaCierreDesde,
  fechaCierreHasta, setFechaCierreHasta,
  fechaInicialDesde, setFechaInicialDesde,
  fechaInicialHasta, setFechaInicialHasta,
  estados, dependencias, vicepresidencias, direcciones, responsables, estadosPlan,
  hasFilters, clearAll, total,
}: FiltersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const estadoOptions = estados.map((e) => ({ value: e, label: e }))
  const depOptions = dependencias.map((d) => ({ value: d, label: d }))
  const vpOptions = vicepresidencias.map((v) => ({ value: v, label: v }))
  const respOptions = responsables.map((r) => ({ value: r, label: r }))
  const estadoPlanOptions = estadosPlan.map((e) => ({ value: e, label: e }))

  const activeFiltersCount = [
    estado, dependencia, vicepresidencia, direccion, responsable, estadoPlan,
    fechaCierreDesde, fechaCierreHasta, fechaInicialDesde, fechaInicialHasta,
  ].filter(Boolean).length + (vencido ? 1 : 0) + (conProrroga ? 1 : 0)

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Main search bar */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, descripción, plan de acción…"
                className="pl-10 h-10 bg-muted/30 border-muted-foreground/20 focus:bg-background"
              />
            </div>
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant={isExpanded ? 'secondary' : 'outline'} className="gap-2 h-10">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                      {activeFiltersCount}
                    </Badge>
                  )}
                  <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <span className="text-sm text-muted-foreground font-medium tabular-nums">
                {total.toLocaleString()} {total === 1 ? 'registro' : 'registros'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick filters */}
        <div className="px-4 py-3 bg-muted/20 border-b border-border/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">Acceso rápido:</span>
            <FilterPill label="Vencidos" active={vencido} onClick={() => setVencido(!vencido)} variant="danger" icon={AlertTriangle} />
            <FilterPill label="Con prórroga" active={conProrroga} onClick={() => setConProrroga(!conProrroga)} variant="warning" icon={Clock} />
            <Separator orientation="vertical" className="h-5 mx-1" />
            <div className="flex items-center gap-2">
              <div className="min-w-36">
                <Select value={estado} onChange={(e) => setEstado(e.target.value)} options={estadoOptions} placeholder="Estado" />
              </div>
              <div className="min-w-40">
                <Select value={estadoPlan} onChange={(e) => setEstadoPlan(e.target.value)} options={estadoPlanOptions} placeholder="Estado plan" />
              </div>
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="ml-auto h-8 text-xs text-muted-foreground hover:text-foreground">
                <RotateCcw className="w-3 h-3 mr-1.5" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Expanded filters */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent>
            <div className="p-4 bg-muted/10 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Organización */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    Organización
                  </h4>
                  <div className="space-y-2">
                    {vicepresidencias.length > 0 && (
                      <ComboboxFilter value={vicepresidencia} onChange={setVicepresidencia} options={vicepresidencias} placeholder="Área / Vicepresidencia" />
                    )}
                    {direcciones.length > 0 && (
                      <ComboboxFilter value={direccion} onChange={setDireccion} options={direcciones} placeholder="Dirección" />
                    )}
                    {dependencias.length > 0 && (
                      <Select value={dependencia} onChange={(e) => setDependencia(e.target.value)} options={depOptions} placeholder="Dependencia" />
                    )}
                  </div>
                </div>

                {/* Responsables */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    Responsable
                  </h4>
                  <div className="space-y-2">
                    <ComboboxFilter value={responsable} onChange={setResponsable} options={responsables} placeholder="Responsable" />
                  </div>
                </div>

                {/* Fechas */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Fechas
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Fecha cierre proyectada</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="date"
                          value={fechaCierreDesde}
                          onChange={(e) => setFechaCierreDesde(e.target.value)}
                          className="flex-1 h-9 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <span className="text-xs text-muted-foreground">→</span>
                        <input
                          type="date"
                          value={fechaCierreHasta}
                          onChange={(e) => setFechaCierreHasta(e.target.value)}
                          className="flex-1 h-9 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Fecha inicial evento</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="date"
                          value={fechaInicialDesde}
                          onChange={(e) => setFechaInicialDesde(e.target.value)}
                          className="flex-1 h-9 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <span className="text-xs text-muted-foreground">→</span>
                        <input
                          type="date"
                          value={fechaInicialHasta}
                          onChange={(e) => setFechaInicialHasta(e.target.value)}
                          className="flex-1 h-9 px-2.5 text-xs rounded-md border border-input bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Active filters chips */}
        {hasFilters && (
          <div className="px-4 py-3 border-t border-border/50 flex flex-wrap gap-2">
            {estado && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                Estado: {estado}
                <button onClick={() => setEstado('')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {dependencia && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                {dependencia.length > 20 ? dependencia.slice(0, 20) + '…' : dependencia}
                <button onClick={() => setDependencia('')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {vicepresidencia && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                Área: {vicepresidencia.length > 16 ? vicepresidencia.slice(0, 16) + '…' : vicepresidencia}
                <button onClick={() => setVicepresidencia('')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {direccion && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                Dir: {direccion.length > 16 ? direccion.slice(0, 16) + '…' : direccion}
                <button onClick={() => setDireccion('')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {responsable && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                {responsable.length > 16 ? responsable.slice(0, 16) + '…' : responsable}
                <button onClick={() => setResponsable('')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {estadoPlan && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                Plan: {estadoPlan}
                <button onClick={() => setEstadoPlan('')} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {vencido && (
              <Badge variant="destructive" className="gap-1.5 pr-1.5">
                Vencidos
                <button onClick={() => setVencido(false)} className="hover:bg-red-400/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {conProrroga && (
              <Badge className="gap-1.5 pr-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200">
                Con prórroga
                <button onClick={() => setConProrroga(false)} className="hover:bg-amber-300/30 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {(fechaCierreDesde || fechaCierreHasta) && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                Cierre: {fechaCierreDesde || '…'} → {fechaCierreHasta || '…'}
                <button onClick={() => { setFechaCierreDesde(''); setFechaCierreHasta('') }} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
            {(fechaInicialDesde || fechaInicialHasta) && (
              <Badge variant="secondary" className="gap-1.5 pr-1.5">
                Inicial: {fechaInicialDesde || '…'} → {fechaInicialHasta || '…'}
                <button onClick={() => { setFechaInicialDesde(''); setFechaInicialHasta('') }} className="hover:bg-muted-foreground/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Hallazgos Table ──────────────────────────────────────────────────────────

function HallazgosTable({
  hallazgos, loading, meta, page, setPage, onSelect,
}: {
  hallazgos: Hallazgo[]; loading: boolean; meta: Meta
  page: number; setPage: (p: number) => void; onSelect: (h: Hallazgo) => void
}) {
  if (loading) return <PageLoader />

  if (hallazgos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Search className="w-8 h-8 opacity-40" />
        </div>
        <p className="text-sm font-medium">No se encontraron hallazgos</p>
        <p className="text-xs text-muted-foreground mt-1">Intenta ajustar los filtros de búsqueda</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-xs">Código</TableHead>
              <TableHead className="font-semibold text-xs">Descripción</TableHead>
              <TableHead className="font-semibold text-xs">Dependencia</TableHead>
              <TableHead className="font-semibold text-xs">Estado</TableHead>
              <TableHead className="font-semibold text-xs">F. Inicial</TableHead>
              <TableHead className="font-semibold text-xs">F. Cierre</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hallazgos.map((h) => (
              <TableRow key={h.id} className="group hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
                  {h.codigo_del_hallazgo ?? '—'}
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="truncate text-foreground text-sm" title={h.descripcion ?? ''}>
                    {h.descripcion ?? '—'}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-xs max-w-[140px]">
                  <p className="truncate" title={h.dependencia_reporta_ero ?? h.direccion ?? ''}>{h.dependencia_reporta_ero ?? h.direccion ?? '—'}</p>
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
                <TableCell>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => onSelect(h)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 text-primary hover:bg-primary/10"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {meta.pages > 1 && (
        <>
          <Separator />
          <Pagination page={page} meta={meta} setPage={setPage} />
        </>
      )}
    </>
  )
}

// ─── Actividades Table ────────────────────────────────────────────────────────

function ActividadesTable({
  actividades, loading, meta, page, setPage, onSelect,
}: {
  actividades: Actividad[]; loading: boolean; meta: Meta
  page: number; setPage: (p: number) => void; onSelect: (a: Actividad) => void
}) {
  if (loading) return <PageLoader />

  if (actividades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <ListChecks className="w-8 h-8 opacity-40" />
        </div>
        <p className="text-sm font-medium">No se encontraron actividades</p>
        <p className="text-xs text-muted-foreground mt-1">Intenta ajustar los filtros de búsqueda</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold text-xs">Hallazgo</TableHead>
              <TableHead className="font-semibold text-xs">Plan de acción</TableHead>
              <TableHead className="font-semibold text-xs">Responsable</TableHead>
              <TableHead className="font-semibold text-xs">Estado Acción</TableHead>
              <TableHead className="font-semibold text-xs">F. Compromiso</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actividades.map((a) => (
              <TableRow key={a.id} className="group hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
                  {a.codigo_del_hallazgo ?? '—'}
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="truncate text-foreground text-sm" title={a.descripcion ?? ''}>
                    {a.descripcion ?? '—'}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-xs max-w-[140px]">
                  <p className="truncate" title={a.responsable ?? ''}>{a.responsable ?? '—'}</p>
                </TableCell>
                <TableCell className="max-w-[160px]">
                  <div className="truncate"><StatusBadge value={a.estado_accion} /></div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                  {formatDate(a.fecha_compromiso)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => onSelect(a)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 text-primary hover:bg-primary/10"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {meta.pages > 1 && (
        <>
          <Separator />
          <Pagination page={page} meta={meta} setPage={setPage} />
        </>
      )}
    </>
  )
}

// ─── Actividad Detail Modal ───────────────────────────────────────────────────

function ActividadDetailModal({ actividad, onClose }: { actividad: Actividad | null; onClose: () => void }) {
  if (!actividad) return null
  return (
    <Modal open={!!actividad} onClose={onClose} title="Actividad" size="lg">
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <DetailField label="Hallazgo" value={actividad.codigo_del_hallazgo} />
          <DetailField label="Estado Plan" value={actividad.estado_plan_accion} />
          <DetailField label="Responsable" value={actividad.responsable} />
          <DetailField label="Estado Acción" value={actividad.estado_accion} />
          <DetailField label="Responsable Acción" value={actividad.responsable_accion} />
          <DetailField label="Fecha Compromiso" value={formatDate(actividad.fecha_compromiso)} />
          <DetailField label="Prórroga" value={actividad.prorroga} />
          <DetailField label="Fecha Prórroga" value={formatDate(actividad.fecha_prorroga)} />
        </div>
        {actividad.descripcion && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Descripción</p>
            <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">{actividad.descripcion}</p>
          </div>
        )}
        {actividad.observaciones && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Observaciones</p>
            <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">{actividad.observaciones}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HallazgosPage() {
  const pathname = usePathname()

  const [activeMainTab, setActiveMainTab] = useState<'hallazgos' | 'actividades'>('hallazgos')

  // Hallazgos state
  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([])
  const [hallazgosMeta, setHallazgosMeta] = useState<Meta>({ total: 0, pages: 1, page: 1 })
  const [hallazgosLoading, setHallazgosLoading] = useState(true)
  const [selectedHallazgo, setSelectedHallazgo] = useState<Hallazgo | null>(null)
  const [hallazgosPage, setHallazgosPage] = useState(1)

  // Actividades state
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [actividadesMeta, setActividadesMeta] = useState<Meta>({ total: 0, pages: 1, page: 1 })
  const [actividadesLoading, setActividadesLoading] = useState(true)
  const [selectedActividad, setSelectedActividad] = useState<Actividad | null>(null)
  const [actividadesPage, setActividadesPage] = useState(1)

  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'actividades'>('info')

  // Filters
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [dependencia, setDependencia] = useState('')
  const [vicepresidencia, setVicepresidencia] = useState('')
  const [direccion, setDireccion] = useState('')
  const [responsable, setResponsable] = useState('')
  const [estadoPlan, setEstadoPlan] = useState('')
  const [vencido, setVencido] = useState(false)
  const [conProrroga, setConProrroga] = useState(false)
  const [fechaCierreDesde, setFechaCierreDesde] = useState('')
  const [fechaCierreHasta, setFechaCierreHasta] = useState('')
  const [fechaInicialDesde, setFechaInicialDesde] = useState('')
  const [fechaInicialHasta, setFechaInicialHasta] = useState('')

  // Filter options
  const [estados, setEstados] = useState<string[]>([])
  const [dependencias, setDependencias] = useState<string[]>([])
  const [vicepresidencias, setVicepresidencias] = useState<string[]>([])
  const [direcciones, setDirecciones] = useState<string[]>([])
  const [responsables, setResponsables] = useState<string[]>([])
  const [estadosPlan, setEstadosPlan] = useState<string[]>([])

  const [showAnalyzer, setShowAnalyzer] = useState(false)

  // Debounce search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [search])

  const clearAll = () => {
    setSearch(''); setEstado(''); setDependencia(''); setVicepresidencia('')
    setDireccion(''); setResponsable(''); setEstadoPlan(''); setVencido(false); setConProrroga(false)
    setFechaCierreDesde(''); setFechaCierreHasta(''); setFechaInicialDesde(''); setFechaInicialHasta('')
  }

  const hasFilters = !!search || !!estado || !!dependencia || !!vicepresidencia || !!direccion ||
    !!responsable || !!estadoPlan || vencido || conProrroga || !!fechaCierreDesde ||
    !!fechaCierreHasta || !!fechaInicialDesde || !!fechaInicialHasta

  // Load filter options once
  useEffect(() => {
    Promise.allSettled([
      hallazgosApi.estados(),
      hallazgosApi.dependencias(),
      hallazgosApi.vicepresidencias(),
      hallazgosApi.direcciones(),
      hallazgosApi.responsables(),
      hallazgosApi.estadosPlan(),
    ]).then(([est, dep, vp, dir, resp, plan]) => {
      if (est.status === 'fulfilled') setEstados((est.value.data as { estados: string[] }).estados)
      if (dep.status === 'fulfilled') setDependencias((dep.value.data as { dependencias: string[] }).dependencias)
      if (vp.status === 'fulfilled') setVicepresidencias((vp.value.data as { vicepresidencias: string[] }).vicepresidencias)
      if (dir.status === 'fulfilled') setDirecciones((dir.value.data as { direcciones: string[] }).direcciones)
      if (resp.status === 'fulfilled') setResponsables((resp.value.data as { responsables: string[] }).responsables)
      if (plan.status === 'fulfilled') setEstadosPlan((plan.value.data as { estados_plan_accion: string[] }).estados_plan_accion)
    })
  }, [])

  const loadHallazgos = useCallback(async (p: number) => {
    setHallazgosLoading(true)
    try {
      const res = await hallazgosApi.list({
        page: p,
        per_page: 15,
        search: debouncedSearch || undefined,
        estado: estado || undefined,
        dependencia: dependencia || undefined,
        vicepresidencia: vicepresidencia || undefined,
        direccion: direccion || undefined,
        responsable: responsable || undefined,
        estado_plan_accion: estadoPlan || undefined,
        vencido: vencido ? 'true' : undefined,
        con_prorroga: conProrroga ? 'true' : undefined,
        fecha_cierre_desde: fechaCierreDesde || undefined,
        fecha_cierre_hasta: fechaCierreHasta || undefined,
        fecha_inicial_desde: fechaInicialDesde || undefined,
        fecha_inicial_hasta: fechaInicialHasta || undefined,
      })
      const data = res.data as { hallazgos: Hallazgo[]; total: number; pages: number; page: number }
      setHallazgos(data.hallazgos)
      setHallazgosMeta({ total: data.total, pages: data.pages, page: data.page })
    } catch { /* silent */ } finally {
      setHallazgosLoading(false)
    }
  }, [debouncedSearch, estado, dependencia, vicepresidencia, direccion, responsable, estadoPlan, vencido, conProrroga, fechaCierreDesde, fechaCierreHasta, fechaInicialDesde, fechaInicialHasta])

  const loadActividades = useCallback(async (p: number) => {
    setActividadesLoading(true)
    try {
      const res = await actividadesApi.list({
        page: p,
        per_page: 15,
        search: debouncedSearch || undefined,
        responsable: responsable || undefined,
        estado_plan_accion: estadoPlan || undefined,
        vencido: vencido ? 'true' : undefined,
        con_prorroga: conProrroga ? 'true' : undefined,
      })
      const data = res.data as { actividades: Actividad[]; total: number; pages: number; page: number }
      setActividades(data.actividades)
      setActividadesMeta({ total: data.total, pages: data.pages, page: data.page })
    } catch { /* silent */ } finally {
      setActividadesLoading(false)
    }
  }, [debouncedSearch, responsable, estadoPlan, vencido, conProrroga])

  // Reset pages when filters change
  const didMountFilters = useRef(false)
  useEffect(() => {
    if (!didMountFilters.current) { didMountFilters.current = true; return }
    setHallazgosPage(1)
    setActividadesPage(1)
  }, [debouncedSearch, estado, dependencia, vicepresidencia, responsable, estadoPlan, vencido, conProrroga, fechaCierreDesde, fechaCierreHasta, fechaInicialDesde, fechaInicialHasta])

  useEffect(() => { loadHallazgos(hallazgosPage) }, [hallazgosPage, loadHallazgos])
  useEffect(() => { loadActividades(actividadesPage) }, [actividadesPage, loadActividades])

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Hallazgos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Administra y da seguimiento a los hallazgos y actividades del sistema
            </p>
          </div>
          <Button
            variant={showAnalyzer ? 'secondary' : 'outline'}
            onClick={() => setShowAnalyzer(!showAnalyzer)}
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Analizar Excel
          </Button>
        </div>

        {/* Excel Analyzer */}
        {showAnalyzer && (
          <ExcelAnalyzer onClose={() => setShowAnalyzer(false)} />
        )}

        {/* Main Tabs */}
        <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as 'hallazgos' | 'actividades')}>
          <div className="flex items-center justify-between">
            <TabsList className="h-11">
              <TabsTrigger value="hallazgos" className="gap-2 px-4">
                <ClipboardList className="w-4 h-4" />
                Hallazgos
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {hallazgosMeta.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="actividades" className="gap-2 px-4">
                <ListChecks className="w-4 h-4" />
                Actividades
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {actividadesMeta.total}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-4">
            <FiltersPanel
              search={search} setSearch={setSearch}
              estado={estado} setEstado={setEstado}
              dependencia={dependencia} setDependencia={setDependencia}
              vicepresidencia={vicepresidencia} setVicepresidencia={setVicepresidencia}
              direccion={direccion} setDireccion={setDireccion}
              responsable={responsable} setResponsable={setResponsable}
              estadoPlan={estadoPlan} setEstadoPlan={setEstadoPlan}
              vencido={vencido} setVencido={setVencido}
              conProrroga={conProrroga} setConProrroga={setConProrroga}
              fechaCierreDesde={fechaCierreDesde} setFechaCierreDesde={setFechaCierreDesde}
              fechaCierreHasta={fechaCierreHasta} setFechaCierreHasta={setFechaCierreHasta}
              fechaInicialDesde={fechaInicialDesde} setFechaInicialDesde={setFechaInicialDesde}
              fechaInicialHasta={fechaInicialHasta} setFechaInicialHasta={setFechaInicialHasta}
              estados={estados}
              dependencias={dependencias}
              vicepresidencias={vicepresidencias}
              direcciones={direcciones}
              responsables={responsables}
              estadosPlan={estadosPlan}
              hasFilters={hasFilters}
              clearAll={clearAll}
              total={activeMainTab === 'hallazgos' ? hallazgosMeta.total : actividadesMeta.total}
            />
          </div>

          <TabsContent value="hallazgos" className="mt-4">
            <Card className="overflow-hidden">
              <HallazgosTable
                hallazgos={hallazgos}
                loading={hallazgosLoading}
                meta={hallazgosMeta}
                page={hallazgosPage}
                setPage={setHallazgosPage}
                onSelect={(h) => { setSelectedHallazgo(h); setActiveDetailTab('info') }}
              />
            </Card>
          </TabsContent>

          <TabsContent value="actividades" className="mt-4">
            <Card className="overflow-hidden">
              <ActividadesTable
                actividades={actividades}
                loading={actividadesLoading}
                meta={actividadesMeta}
                page={actividadesPage}
                setPage={setActividadesPage}
                onSelect={setSelectedActividad}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Hallazgo Detail Modal */}
      <Modal
        open={!!selectedHallazgo}
        onClose={() => setSelectedHallazgo(null)}
        title={`Hallazgo ${selectedHallazgo?.codigo_del_hallazgo ?? ''}`}
        size="2xl"
      >
        {selectedHallazgo && (
          <div className="space-y-4">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveDetailTab('info')}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  activeDetailTab === 'info'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Información
              </button>
              <button
                onClick={() => setActiveDetailTab('actividades')}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  activeDetailTab === 'actividades'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                Actividades
              </button>
            </div>

            {activeDetailTab === 'info' && (
              <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Descripción</p>
                  <p className="text-sm text-foreground bg-muted/50 rounded-lg p-4">{selectedHallazgo.descripcion ?? '—'}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <DetailField label="Código del hallazgo" value={selectedHallazgo.codigo_del_hallazgo} />
                  <DetailField label="Estado" value={selectedHallazgo.estado} />
                  <DetailField label="Área / Vicepresidencia" value={selectedHallazgo.vicepresidencia} />
                  <DetailField label="Dirección" value={selectedHallazgo.direccion} />
                  <DetailField label="Dependencia ERO" value={selectedHallazgo.dependencia_reporta_ero} />
                  <DetailField label="Reportado para" value={selectedHallazgo.reportado_para} />
                  <DetailField label="Reportado por" value={selectedHallazgo.reportado_por} />
                  <DetailField label="Aplicativo afecta ERO" value={selectedHallazgo.aplicativo_afecta_ero} />
                  <DetailField label="Fecha inicial" value={formatDate(selectedHallazgo.fecha_inicial_evento)} />
                  <DetailField label="Fecha finalización" value={formatDate(selectedHallazgo.fecha_finalizacion_evento)} />
                  <DetailField label="Fecha cierre proyectada" value={formatDate(selectedHallazgo.fecha_cierre_proyectada)} />
                  <DetailField label="Prórroga" value={selectedHallazgo.prorroga} />
                  <DetailField label="Fecha cierre prórroga" value={formatDate(selectedHallazgo.fecha_cierre_final_prorroga)} />
                </div>

                {selectedHallazgo.observaciones && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Observaciones</p>
                    <p className="text-sm text-foreground bg-muted/50 rounded-lg p-4">{selectedHallazgo.observaciones}</p>
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'actividades' && (
              <div className="max-h-[65vh] overflow-y-auto pr-1">
                <ActividadesModalTab hallazgoId={selectedHallazgo.id} />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Actividad Detail Modal */}
      <ActividadDetailModal
        actividad={selectedActividad}
        onClose={() => setSelectedActividad(null)}
      />
    </DashboardShell>
  )
}
