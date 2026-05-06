'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Clock, Calendar, RefreshCw, FileWarning, Target, Activity,
  BarChart3, Layers, AlertTriangle, CheckCircle2, Play, Upload,
  FileText, Bell, Search, MoreVertical, Eye, Shield, Send, TrendingUp,
  X, SlidersHorizontal,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/Input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { KpiRow } from '@/components/molecules/KpiRow'
import { Pagination } from '@/components/molecules/Pagination'
import { DonutChartCard } from '@/components/molecules/DonutChartCard'
import { ClosureGaugeCard } from '@/components/molecules/ClosureGaugeCard'
import { TopRetrasadosCard } from '@/components/organisms/dashboard/TopRetrasadosCard'
import { ResponsablesCriticosCard } from '@/components/organisms/dashboard/ResponsablesCriticosCard'
import { BitacoraCard } from '@/components/organisms/dashboard/BitacoraCard'
import { AlertasCriticasPanel } from '@/components/organisms/dashboard/AlertasCriticasPanel'
import { NotificacionChecklistCard } from '@/components/organisms/dashboard/NotificacionChecklistCard'
import { HallazgoCard } from '@/components/organisms/hallazgos/HallazgoCard'
import { AlertCard } from '@/components/organisms/hallazgos/AlertCard'
import { ModalVerDetalle, ModalEditarPlan, ModalSubirEvidencia, ModalCambiarEstado, ModalSolicitarProrroga, ModalNotificacionPersonalizada, ModalCorreoMasivo } from '@/components/organisms/modals'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import { SemaforoBadge } from '@/components/atoms/SemaforoBadge'
import { useGestorData } from '@/hooks/useGestorData'
import { useAuth } from '@/lib/auth'
import { hallazgosApi } from '@/lib/api'
import { Select } from '@/components/ui/Select'
import { CHART_COLORS_HEX } from '@/types'
import type { HallazgoRow, ActividadRow, HallazgoWithActividades } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withColors(data: { name: string; value: number; fill?: string }[]) {
  return data.map((d, i) => ({ ...d, fill: d.fill ?? CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ColorBar(props: any) {
  const { x, y, width, height, fill } = props as { x: number; y: number; width: number; height: number; fill: string }
  if (!height || height <= 0) return null
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARDS_PER_PAGE = 9
const SEG_PER_PAGE = 9

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
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

// ─── Main Component ───────────────────────────────────────────────────────────

type ModalType = 'detalle' | 'editar' | 'evidencia' | 'estado' | 'prorroga' | null



export default function GestorDashboard() {
  const { user } = useAuth()
  const { metricas, porEstado, porEstadoPlan, porSemaforo, topRetrasados, hallazgos, actividades, bitacora, responsablesCriticos, loading, refreshing, reload } = useGestorData()

  const [activeTab, setActiveTab] = useState('overview')
  const [searchA, setSearchA] = useState('')
  const [aPage, setAPage] = useState(1)
  const [vPage, setVPage] = useState(1)
  const [pPage, setPPage] = useState(1)
  const [modalOpen, setModalOpen] = useState<ModalType>(null)
  const [modalHallazgo, setModalHallazgo] = useState<HallazgoRow | null>(null)
  const [notifPersonalizadaOpen, setNotifPersonalizadaOpen] = useState(false)
  const [correoMasivoOpen, setCorreoMasivoOpen] = useState(false)

  // ── Hallazgos tab: server-side fetch con filtros ──
  const [hSearch, setHSearch] = useState('')
  const [hEstado, setHEstado] = useState('')
  const [hSoloActivos, setHSoloActivos] = useState(true)
  const [hVencido, setHVencido] = useState(false)
  const [hPage, setHPage] = useState(1)
  const [hRows, setHRows] = useState<HallazgoRow[]>([])
  const [hTotal, setHTotal] = useState(0)
  const [hPages, setHPages] = useState(1)
  const [hLoading, setHLoading] = useState(false)
  const [estadosOpciones, setEstadosOpciones] = useState<string[]>([])

  const fetchHallazgos = useCallback(async (page: number) => {
    setHLoading(true)
    try {
      const params: Record<string, unknown> = { page, per_page: 50 }
      if (hSearch)       params.search       = hSearch
      if (hEstado)       params.estado       = hEstado
      if (hSoloActivos)  params.solo_activos = 'true'
      if (hVencido)      params.vencido      = 'true'
      const res = await hallazgosApi.list(params)
      const data = res.data as { hallazgos: HallazgoRow[]; total: number; pages: number }
      setHRows(data.hallazgos)
      setHTotal(data.total)
      setHPages(data.pages)
    } catch { /* silent */ } finally {
      setHLoading(false)
    }
  }, [hSearch, hEstado, hSoloActivos, hVencido])

  useEffect(() => {
    if (activeTab === 'hallazgos') fetchHallazgos(hPage)
  }, [activeTab, hPage, fetchHallazgos])

  useEffect(() => {
    if (activeTab === 'hallazgos') { setHPage(1); fetchHallazgos(1) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hSearch, hEstado, hSoloActivos, hVencido])

  useEffect(() => {
    hallazgosApi.estados().then(r => {
      setEstadosOpciones((r.data as string[]).filter(Boolean))
    }).catch(() => {})
  }, [])

  const total = metricas?.total ?? 0
  const cerradas = metricas?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  const hasFilters = !!(hSearch || hEstado || hVencido || !hSoloActivos)
  function clearFilters() { setHSearch(''); setHEstado(''); setHVencido(false); setHSoloActivos(true); setHPage(1) }

  function openModal(type: ModalType, h: HallazgoRow) { setModalHallazgo(h); setModalOpen(type) }
  function closeModal() { setModalOpen(null) }
  function onSearchA(val: string) { setSearchA(val); setAPage(1) }

  const hallazgosConActividades = groupActivitiesByHallazgo(actividades, hallazgos)
  const filtA = hallazgosConActividades.filter(h => {
    const t = searchA.toLowerCase()
    return h.codigo.toLowerCase().includes(t) || h.descripcion.toLowerCase().includes(t)
  })
  const pagedA = filtA.slice((aPage - 1) * CARDS_PER_PAGE, aPage * CARDS_PER_PAGE)
  const aPagesTotal = Math.ceil(filtA.length / CARDS_PER_PAGE)

  const vencidos = hallazgos.filter(h => h.dias_restantes < 0)
  const proximos = hallazgos.filter(h => h.dias_restantes >= 0 && h.dias_restantes <= 7)
  const pagedVencidos = vencidos.slice((vPage - 1) * SEG_PER_PAGE, vPage * SEG_PER_PAGE)
  const pagedProximos = proximos.slice((pPage - 1) * SEG_PER_PAGE, pPage * SEG_PER_PAGE)

  const noCerrado = (h: HallazgoRow) => !(h.estado ?? '').toLowerCase().includes('cerrado')
  const slaEnTiempo = hallazgos.filter(h => noCerrado(h) && h.dias_restantes > 7).length
  const slaEnRiesgo = hallazgos.filter(h => noCerrado(h) && h.dias_restantes >= 0 && h.dias_restantes <= 7).length
  const slaFuera = hallazgos.filter(h => noCerrado(h) && h.dias_restantes < 0).length
  const slaActivos = slaEnTiempo + slaEnRiesgo + slaFuera
  const slaPct = slaActivos > 0 ? Math.round((slaEnTiempo / slaActivos) * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <RefreshCw className="animate-spin w-5 h-5 mr-2" />Cargando…
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Panel del Gestor</h1>
            <p className="text-sm text-muted-foreground">Gestión operativa · <span className="font-medium">{user?.dependencia ?? 'Sin dependencia'}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => reload(true)} disabled={refreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />Actualizar
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setNotifPersonalizadaOpen(true)}>
            <Send className="h-3.5 w-3.5" />Notificar
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setCorreoMasivoOpen(true)}>
            <Send className="h-3.5 w-3.5" />Correo masivo
          </Button>
          <Dialog>
            <DialogContent>
              <DialogHeader><DialogTitle>Crear Plan de Acción</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><label className="text-sm font-medium">Hallazgo asociado</label><Input placeholder="Buscar hallazgo..." /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Descripción del plan</label><Textarea placeholder="Describa las acciones a realizar..." /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-sm font-medium">Responsable</label><Input placeholder="Nombre del responsable" /></div>
                  <div className="space-y-2"><label className="text-sm font-medium">Fecha compromiso</label><Input type="date" /></div>
                </div>
              </div>
              <DialogFooter><Button variant="outline">Cancelar</Button><Button>Crear plan</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Resumen</span></TabsTrigger>
          <TabsTrigger value="hallazgos" className="gap-2"><FileWarning className="h-4 w-4" /><span className="hidden sm:inline">Hallazgos</span></TabsTrigger>
          <TabsTrigger value="actividades" className="gap-2"><Activity className="h-4 w-4" /><span className="hidden sm:inline">Actividades</span></TabsTrigger>
          <TabsTrigger value="seguimiento" className="gap-2"><Bell className="h-4 w-4" /><span className="hidden sm:inline">Seguimiento</span></TabsTrigger>
          <TabsTrigger value="analitica" className="gap-2"><TrendingUp className="h-4 w-4" /><span className="hidden sm:inline">Analítica</span></TabsTrigger>
        </TabsList>

        {/* ── RESUMEN ── */}
        <TabsContent value="overview" className="space-y-6">
          <AlertasCriticasPanel hallazgos={hallazgos} onAtendido={() => reload(true)} />
          <KpiRow items={[
            { title: 'Total a cargo', value: metricas?.total ?? 0, icon: Layers, subtitle: 'Hallazgos en gestión' },
            { title: 'En Proceso', value: metricas?.en_proceso ?? 0, icon: Play, variant: 'info', subtitle: 'Ejecutándose' },
            { title: 'Vencidos', value: metricas?.vencidos ?? 0, icon: FileWarning, variant: 'danger', subtitle: 'Requieren atención' },
            { title: 'Próximos', value: metricas?.proximos_vencer ?? 0, icon: Clock, variant: 'warning', subtitle: 'Próximos 7 días' },
            { title: 'Índice cierre', value: `${cumplimiento}%`, icon: Target, variant: cumplimiento >= 70 ? 'success' : 'danger', subtitle: `${cerradas}/${total} cerrados` },
          ]} columns={5} />
          <KpiRow items={[
            { title: 'En validación', value: metricas?.pendientes_validacion ?? 0, icon: Shield, variant: 'info' },
            { title: 'Con prórroga', value: metricas?.con_prorroga ?? 0, icon: Calendar },
            { title: 'Mis actividades', value: metricas?.mis_actividades ?? 0, icon: Activity },
          ]} columns={3} />
          <div className="grid gap-4 lg:grid-cols-3">
            <DonutChartCard title="Semáforo de Riesgo" description="Cumplimiento por fecha" data={porSemaforo} centerLabel={String(total)} centerSubLabel="Total" />
            <DonutChartCard title="Estado de Hallazgos" description="Distribución por estado" data={porEstado} centerLabel={String(total)} centerSubLabel="Hallazgos" />
            <ClosureGaugeCard cumplimiento={cumplimiento} cerradas={cerradas} total={total} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <TopRetrasadosCard data={topRetrasados} />
            <ResponsablesCriticosCard responsables={responsablesCriticos} />
          </div>
          <BitacoraCard entries={bitacora} />
        </TabsContent>

        {/* ── HALLAZGOS ── */}
        <TabsContent value="hallazgos" className="space-y-4">
          {/* Barra de filtros */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar código, descripción o responsable..."
                  className="pl-9"
                  value={hSearch}
                  onChange={e => setHSearch(e.target.value)}
                />
              </div>
              <Select
                placeholder="Estado"
                options={estadosOpciones.map(e => ({ value: e, label: e }))}
                value={hEstado}
                onChange={e => setHEstado(e.target.value)}
                className="sm:w-44"
              />
              <Button
                variant={hSoloActivos ? 'default' : 'outline'}
                size="sm"
                className="gap-2 whitespace-nowrap"
                onClick={() => setHSoloActivos(v => !v)}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {hSoloActivos ? 'Solo activos' : 'Todos'}
              </Button>
              <Button
                variant={hVencido ? 'destructive' : 'outline'}
                size="sm"
                className="gap-2 whitespace-nowrap"
                onClick={() => setHVencido(v => !v)}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Vencidos
              </Button>
              {hasFilters && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" />Limpiar
                </Button>
              )}
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="px-5 py-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">Hallazgos en Gestión</CardTitle>
                  <CardDescription className="text-xs">
                    {hSoloActivos ? 'Solo activos' : 'Todos'}{hVencido ? ' · Vencidos' : ''}{hEstado ? ` · ${hEstado}` : ''}
                  </CardDescription>
                </div>
                <Badge variant="secondary">{hTotal} registros</Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {hLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />Cargando…
                </div>
              ) : hRows.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Sin registros</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          {['Código', 'Descripción', 'Semáforo', 'Estado', 'Responsable', 'Cierre', ''].map(col => (
                            <th key={col} className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {hRows.map(h => (
                          <tr key={h.id} className={cn(
                            'hover:bg-muted/20 transition-colors',
                            h.dias_restantes < 0 && 'bg-destructive/5',
                          )}>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-primary whitespace-nowrap">{h.codigo_del_hallazgo ?? '—'}</td>
                            <td className="px-4 py-2.5 max-w-xs truncate text-foreground/80">{h.descripcion ?? '—'}</td>
                            <td className="px-4 py-2.5"><SemaforoBadge dias={h.dias_restantes} /></td>
                            <td className="px-4 py-2.5"><StatusBadge value={h.estado} /></td>
                            <td className="px-4 py-2.5 text-muted-foreground">{h.responsable_plan_accion ?? '—'}</td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(h.fecha_cierre_proyectada)}</td>
                            <td className="px-4 py-2.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>} />
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openModal('detalle', h)}><Eye className="h-3.5 w-3.5 mr-2" />Ver detalle</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openModal('estado', h)}><Play className="h-3.5 w-3.5 mr-2" />Cambiar estado</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 pb-3">
                    <Pagination page={hPage} pages={hPages} onChange={setHPage} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ACTIVIDADES ── */}
        <TabsContent value="actividades" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Actividades por Hallazgo</h3>
              <p className="text-xs text-muted-foreground">Haz clic en una tarjeta para ver el detalle y workflow</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-9" value={searchA} onChange={e => onSearchA(e.target.value)} />
            </div>
          </div>
          {filtA.length === 0 ? (
            <Card><CardContent className="flex items-center justify-center py-16 text-muted-foreground text-sm">Sin actividades registradas</CardContent></Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pagedA.map(h => <HallazgoCard key={h.id} hallazgo={h} />)}
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

        {/* ── SEGUIMIENTO ── */}
        <TabsContent value="seguimiento" className="space-y-6">
          <KpiRow items={[
            { title: 'En SLA', value: `${slaPct}%`, icon: Target, variant: slaPct >= 70 ? 'success' : 'danger', subtitle: 'Cumplimiento' },
            { title: 'En tiempo', value: slaEnTiempo, icon: CheckCircle2, variant: 'success' },
            { title: 'En riesgo', value: slaEnRiesgo, icon: Clock, variant: 'warning' },
            { title: 'Fuera SLA', value: slaFuera, icon: AlertTriangle, variant: 'danger' },
          ]} columns={4} />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h3 className="text-sm font-semibold">Vencidos</h3>
              <Badge variant="destructive" className="text-[10px]">{vencidos.length}</Badge>
            </div>
            {vencidos.length === 0 ? (
              <Card><CardContent className="flex items-center justify-center py-8 text-muted-foreground text-xs"><CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />Sin vencidos</CardContent></Card>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pagedVencidos.map(h => <AlertCard key={h.id} hallazgo={h} type="vencido" detalle={hallazgosConActividades.find(ha => ha.codigo === h.codigo_del_hallazgo)} />)}
                </div>
                <Pagination page={vPage} pages={Math.ceil(vencidos.length / SEG_PER_PAGE)} onChange={setVPage} />
              </>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold">Próximos a vencer</h3>
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">{proximos.length}</Badge>
            </div>
            {proximos.length === 0 ? (
              <Card><CardContent className="flex items-center justify-center py-8 text-muted-foreground text-xs">Sin hallazgos próximos a vencer (7 días)</CardContent></Card>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pagedProximos.map(h => <AlertCard key={h.id} hallazgo={h} type="proximo" detalle={hallazgosConActividades.find(ha => ha.codigo === h.codigo_del_hallazgo)} />)}
                </div>
                <Pagination page={pPage} pages={Math.ceil(proximos.length / SEG_PER_PAGE)} onChange={setPPage} />
              </>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <NotificacionChecklistCard />
            <BitacoraCard entries={bitacora} />
          </div>
        </TabsContent>

        {/* ── ANALÍTICA ── */}
        <TabsContent value="analitica" className="space-y-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold">Analítica Detallada</h2>
              <p className="text-xs text-muted-foreground">Distribución y tendencias de hallazgos y actividades</p>
            </div>
          </div>

          {/* KPI summary */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {[
              { label: 'En SLA', value: `${slaPct}%`, color: slaPct >= 70 ? 'text-green-500' : 'text-destructive' },
              { label: 'En tiempo', value: slaEnTiempo, color: 'text-green-500' },
              { label: 'En riesgo', value: slaEnRiesgo, color: 'text-amber-500' },
              { label: 'Fuera SLA', value: slaFuera, color: 'text-destructive' },
            ].map(kpi => (
              <Card key={kpi.label}>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className={cn('text-2xl font-bold', kpi.color)}>{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bar charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Hallazgos por Estado</CardTitle>
                <CardDescription className="text-xs">Distribución actual de estados</CardDescription>
              </CardHeader>
              <CardContent>
                {porEstado.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={withColors(porEstado)} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                      />
                      <Bar dataKey="value" name="Hallazgos" shape={ColorBar} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Semáforo de Riesgo</CardTitle>
                <CardDescription className="text-xs">Cumplimiento por fecha límite</CardDescription>
              </CardHeader>
              <CardContent>
                {porSemaforo.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={withColors(porSemaforo)} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                      />
                      <Bar dataKey="value" name="Hallazgos" shape={ColorBar} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Estado del Plan de Acción</CardTitle>
                <CardDescription className="text-xs">Progreso de actividades asignadas</CardDescription>
              </CardHeader>
              <CardContent>
                {porEstadoPlan.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={withColors(porEstadoPlan)} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                      />
                      <Bar dataKey="value" name="Actividades" shape={ColorBar} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Responsables — Cumplimiento</CardTitle>
                <CardDescription className="text-xs">Porcentaje de cierre por responsable crítico</CardDescription>
              </CardHeader>
              <CardContent>
                {responsablesCriticos.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p>
                ) : (
                  <div className="space-y-3 py-1">
                    {responsablesCriticos.map((resp, i) => {
                      const pct = resp.cumplimiento
                      const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="truncate text-foreground/80 max-w-[60%]">{resp.nombre}</span>
                            <span className="font-bold tabular-nums" style={{ color }}>{pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <TopRetrasadosCard data={topRetrasados} />
        </TabsContent>
      </Tabs>

      <ModalNotificacionPersonalizada open={notifPersonalizadaOpen} onClose={() => setNotifPersonalizadaOpen(false)} />
      <ModalCorreoMasivo open={correoMasivoOpen} onClose={() => setCorreoMasivoOpen(false)} />
      <ModalVerDetalle h={modalHallazgo} open={modalOpen === 'detalle'} onClose={closeModal} />
      <ModalEditarPlan h={modalHallazgo} open={modalOpen === 'editar'} onClose={closeModal} onSaved={() => reload(true)} />
      <ModalSubirEvidencia h={modalHallazgo} open={modalOpen === 'evidencia'} onClose={closeModal} />
      <ModalCambiarEstado h={modalHallazgo} open={modalOpen === 'estado'} onClose={closeModal} onSaved={() => reload(true)} />
      <ModalSolicitarProrroga h={modalHallazgo} open={modalOpen === 'prorroga'} onClose={closeModal} onSaved={() => reload(true)} />
    </div>
  )
}
