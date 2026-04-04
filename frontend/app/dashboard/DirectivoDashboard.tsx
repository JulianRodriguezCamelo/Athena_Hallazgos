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
  UserCheck,
  Bell,
} from 'lucide-react'
import { directivoApi, dashboardApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn, formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import {
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
  codigo_del_hallazgo: string
  nombre_plan_accion: string | null
  descripcion: string | null
  estado_plan_accion: string | null
  responsable: string | null
  estado_accion: string | null
  responsable_accion: string | null
  fecha_compromiso: string | null
}

interface PagedHallazgos { hallazgos: HallazgoRow[]; total: number; page: number; pages: number }
interface PagedActividades { actividades: ActividadRow[]; total: number; page: number; pages: number }

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
]

function estadoBadge(estado: string | null) {
  if (!estado) return <Badge variant="outline">—</Badge>
  const lower = estado.toLowerCase()
  if (lower.includes('cerrado')) return <Badge variant="success">{estado}</Badge>
  if (lower.includes('vencido') || lower.includes('atraso')) return <Badge variant="destructive">{estado}</Badge>
  return <Badge variant="warning">{estado}</Badge>
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null
  const window = 2
  let start = Math.max(1, page - window)
  let end = Math.min(pages, page + window)
  if (end - start < window * 2) {
    if (start === 1) end = Math.min(pages, start + window * 2)
    else start = Math.max(1, end - window * 2)
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

function EmptyTable() {
  return <p className="text-xs text-muted-foreground text-center py-8">Sin registros</p>
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

  const [menciones, setMenciones] = useState<PagedHallazgos | null>(null)
  const [mPage, setMPage] = useState(1)

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
    setPorEstadoAccion(accData.map((d, i) => ({ name: d.estado, value: d.total, fill: CHART_COLORS[i % 5] })))

    const estadoData = (estado.data as { data: { estado: string; total: number }[] }).data
    setPorEstado(estadoData.map((d, i) => ({ name: d.estado, value: d.total, fill: CHART_COLORS[i % 5] })))

    const planData = (plan.data as { data: { estado_plan: string; total: number }[] }).data
    setPorEstadoPlan(planData.map((d, i) => ({ name: d.estado_plan, value: d.total, fill: CHART_COLORS[i % 5] })))
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

  const loadMenciones = useCallback(async (p: number) => {
    try {
      const res = await directivoApi.menciones(p)
      setMenciones(res.data as PagedHallazgos)
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
        loadMenciones(1),
      ])
    } catch { /* silent */ } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  // Initial load
  useEffect(() => { load() }, []) // eslint-disable-line

  // Pagination changes (skip initial mount since load() already handles page 1)
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return }
    loadHallazgos(hPage)
  }, [hPage, loadHallazgos])
  useEffect(() => { loadActividades(aPage) }, [aPage, loadActividades]) // eslint-disable-line
  useEffect(() => { loadMenciones(mPage) }, [mPage, loadMenciones]) // eslint-disable-line

  const total = metricas?.total ?? 0
  const cerradas = metricas?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

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

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <DonutCard title="Estado de Hallazgos" description="Distribución de mis hallazgos" data={porEstado} />
        <DonutCard title="Estado del Plan" description="Estado de mis planes de acción" data={porEstadoPlan} />

        {/* Índice cierre radial */}
        <Card>
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
            <ChartContainer config={{ value: { label: 'Cierre' } }} className="mx-auto aspect-square h-[180px]">
              <RadialBarChart
                data={[{ name: 'Cumplimiento', value: cumplimiento, fill: 'var(--color-chart-1)' }]}
                startAngle={180} endAngle={0}
                innerRadius={70} outerRadius={100}
                cx="50%" cy="65%"
              >
                <RadialBar dataKey="value" cornerRadius={10} fill="var(--color-chart-1)" background={{ fill: 'var(--muted)' }} />
              </RadialBarChart>
            </ChartContainer>
            <div className="text-center -mt-12">
              <span className="text-4xl font-bold">{cumplimiento}%</span>
              <p className="text-xs text-muted-foreground mt-1">
                {cumplimiento >= 70
                  ? <span className="text-green-500">Buen desempeño</span>
                  : <span className="text-amber-500">Requiere atención</span>
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado de acciones bar chart */}
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
            <ChartContainer config={{ value: { label: 'Hallazgos', color: 'var(--chart-1)' } }} className="h-[200px] w-full">
              <BarChart data={porEstadoAccion} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={10} width={120}
                  stroke="var(--muted-foreground)"
                  tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 16)}…` : v}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                  {porEstadoAccion.map((entry, i) => (
                    <Cell key={i} fill={entry.fill ?? 'var(--color-chart-1)'} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Mis Hallazgos ────────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="px-5 py-3.5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              Mis Hallazgos
            </CardTitle>
            {hallazgos && <Badge variant="secondary">{hallazgos.total} registros</Badge>}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {!hallazgos || hallazgos.hallazgos.length === 0 ? (
            <EmptyTable />
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

      {/* ── Mis Actividades ──────────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="px-5 py-3.5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Mis Actividades
            </CardTitle>
            {actividades && <Badge variant="secondary">{actividades.total} registros</Badge>}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {!actividades || actividades.actividades.length === 0 ? (
            <EmptyTable />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Código</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Plan</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Descripción</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Estado acción</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Fecha compromiso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {actividades.actividades.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-primary whitespace-nowrap">
                          {a.codigo_del_hallazgo}
                        </td>
                        <td className="px-4 py-2.5 max-w-[160px] truncate" title={a.nombre_plan_accion ?? ''}>
                          {a.nombre_plan_accion ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 max-w-xs truncate text-foreground/80" title={a.descripcion ?? ''}>
                          {a.descripcion ?? '—'}
                        </td>
                        <td className="px-4 py-2.5">{estadoBadge(a.estado_accion)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {a.fecha_compromiso ? formatDateTime(a.fecha_compromiso) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 pb-3">
                <Pagination page={aPage} pages={actividades.pages} onChange={setAPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Menciones en otras áreas ─────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Me mencionan en otras áreas
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Hallazgos de otras dependencias donde apareces como responsable
              </CardDescription>
            </div>
            {menciones && <Badge variant="secondary">{menciones.total} registros</Badge>}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {!menciones || menciones.hallazgos.length === 0 ? (
            <EmptyTable />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Código</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Descripción</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Dependencia</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Estado</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Cierre proyectado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {menciones.hallazgos.map((h) => (
                      <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-primary whitespace-nowrap">
                          {h.codigo_del_hallazgo}
                        </td>
                        <td className="px-4 py-2.5 max-w-xs truncate text-foreground/80" title={h.descripcion}>
                          {h.descripcion}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground max-w-[140px] truncate" title={h.dependencia_reporta_ero ?? ''}>
                          {h.dependencia_reporta_ero ?? '—'}
                        </td>
                        <td className="px-4 py-2.5">{estadoBadge(h.estado)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {h.fecha_cierre_proyectada ? formatDateTime(h.fecha_cierre_proyectada) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 pb-3">
                <Pagination page={mPage} pages={menciones.pages} onChange={setMPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function KpiTile({
  title, value, icon: Icon, variant = 'default',
}: {
  title: string; value: number | string; icon: React.ElementType
  variant?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const variantCls: Record<string, string> = {
    default: '',
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    danger:  'border-destructive/30 bg-destructive/5',
  }
  const iconCls: Record<string, string> = {
    default: 'text-primary',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger:  'text-destructive',
  }
  return (
    <Card className={cn('transition-all hover:shadow-md', variantCls[variant])}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="rounded-lg bg-secondary p-2 shrink-0">
          <Icon className={cn('h-4 w-4', iconCls[variant])} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DonutCard({ title, description, data }: { title: string; description: string; data: ChartItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChart /> : (
          <>
            <ChartContainer config={{ value: { label: 'Cantidad' } }} className="mx-auto aspect-square h-[180px]">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} strokeWidth={2} stroke="var(--background)">
                  {data.map((entry, i) => <Cell key={i} fill={entry.fill ?? CHART_COLORS[i % 5]} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {data.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-[10px] text-muted-foreground">{item.name}</span>
                  <span className="text-[10px] font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
