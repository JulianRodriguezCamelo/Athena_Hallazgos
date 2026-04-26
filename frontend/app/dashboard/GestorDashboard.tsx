'use client'

import { useEffect, useState, useCallback } from 'react'
import { gestorApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  Clock, Calendar, RefreshCw, FileWarning, Target, Activity, BarChart3,
  Layers, CheckCircle2, TrendingUp, TrendingDown, AlertTriangle,
  Play, FileText, Upload, Bell, Search, Filter, MoreVertical, Eye, Edit3, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import { ChartContainer } from '@/components/ui/chart'
import { RadialBar, RadialBarChart } from 'recharts'

import { KpiTile } from '@/components/shared/KpiTile'
import { Pagination } from '@/components/shared/Pagination'
import { EnhancedDonutCard } from '@/components/shared/EnhancedDonutCard'
import { EstadoBadge } from '@/components/shared/EstadoBadge'
import type { ChartItem } from '@/components/shared/EnhancedDonutCard'

import { TopRetrasadosCard } from '@/components/dashboard/gestor/TopRetrasadosCard'
import { ResponsablesCriticosCard } from '@/components/dashboard/gestor/ResponsablesCriticosCard'
import { HallazgoCard } from '@/components/dashboard/gestor/HallazgoCard'
import { AlertCard } from '@/components/dashboard/gestor/AlertCard'
import { SemaforoBadge } from '@/components/dashboard/gestor/SemaforoBadge'
import { BitacoraCard } from '@/components/dashboard/gestor/BitacoraCard'
import { ModalVerDetalle } from '@/components/dashboard/gestor/ModalVerDetalle'
import { ModalEditarPlan } from '@/components/dashboard/gestor/ModalEditarPlan'
import { ModalSubirEvidencia } from '@/components/dashboard/gestor/ModalSubirEvidencia'
import { ModalCambiarEstado } from '@/components/dashboard/gestor/ModalCambiarEstado'
import { ModalSolicitarProrroga } from '@/components/dashboard/gestor/ModalSolicitarProrroga'
import {
  type HallazgoRow,
  type ActividadRow,
  type BitacoraEntry,
  type RetrasadoRow,
  type ResponsableCritico,
  type HallazgoWithActividades,
  PRIORIDAD_CONFIG,
} from '@/components/dashboard/gestor/types'

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

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS_HEX = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

const CARDS_PER_PAGE = 9

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
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
export default function GestorDashboard() {
  const { user } = useAuth()

  const [metricas, setMetricas] = useState<MetricasGestor | null>(null)
  const [porEstado, setPorEstado] = useState<ChartItem[]>([])
  const [porEstadoPlan, setPorEstadoPlan] = useState<ChartItem[]>([])
  const [porSemaforo, setPorSemaforo] = useState<ChartItem[]>([])
  const [topRetrasados, setTopRetrasados] = useState<RetrasadoRow[]>([])
  const [hallazgos, setHallazgos] = useState<HallazgoRow[]>([])
  const [actividades, setActividades] = useState<ActividadRow[]>([])
  const [bitacora, setBitacora] = useState<BitacoraEntry[]>([])
  const [responsablesCriticos, setResponsablesCriticos] = useState<ResponsableCritico[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchH, setSearchH] = useState('')
  const [searchA, setSearchA] = useState('')
  const [hPage, setHPage] = useState(1)
  const [aPage, setAPage] = useState(1)
  const [activeTab, setActiveTab] = useState('overview')

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
      const [metR, estR, planR, semR, hR, aR, respR, bitR, , trR] = await Promise.all([
        gestorApi.misMetricas(),
        gestorApi.porEstado(),
        gestorApi.porEstadoPlan(),
        gestorApi.porSemaforo(),
        gestorApi.hallazgos(1, 100),
        gestorApi.actividades(1, 200),
        gestorApi.responsablesCriticos(),
        gestorApi.bitacora(),
        gestorApi.tiempoPromedio(),
        gestorApi.topRetrasados(),
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

      setTopRetrasados((trR.data as { data: RetrasadoRow[] }).data)
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

  const filtH = hallazgos.filter(h => {
    const t = searchH.toLowerCase()
    return (h.codigo_del_hallazgo ?? '').toLowerCase().includes(t) ||
      (h.descripcion ?? '').toLowerCase().includes(t) ||
      (h.responsable_plan_accion ?? '').toLowerCase().includes(t)
  })
  const H_PAGE = 10
  const pagedH = filtH.slice((hPage - 1) * H_PAGE, hPage * H_PAGE)
  useEffect(() => { setHPage(1) }, [searchH])

  const filtA = hallazgosConActividades.filter(h => {
    const t = searchA.toLowerCase()
    return h.codigo.toLowerCase().includes(t) || h.descripcion.toLowerCase().includes(t)
  })
  const pagedA = filtA.slice((aPage - 1) * CARDS_PER_PAGE, aPage * CARDS_PER_PAGE)
  const aPagesTotal = Math.ceil(filtA.length / CARDS_PER_PAGE)
  useEffect(() => { setAPage(1) }, [searchA])

  const vencidos = hallazgos.filter(h => h.dias_restantes < 0)
  const proximos = hallazgos.filter(h => h.dias_restantes >= 0 && h.dias_restantes <= 7)
  const [vPage, setVPage] = useState(1)
  const [pPage, setPPage] = useState(1)
  const SEG_PER_PAGE = 9
  const pagedVencidos = vencidos.slice((vPage - 1) * SEG_PER_PAGE, vPage * SEG_PER_PAGE)
  const pagedProximos = proximos.slice((pPage - 1) * SEG_PER_PAGE, pPage * SEG_PER_PAGE)
  const vPages = Math.ceil(vencidos.length / SEG_PER_PAGE)
  const pPages = Math.ceil(proximos.length / SEG_PER_PAGE)

  const noCerrado = (h: HallazgoRow) => !(h.estado ?? '').toLowerCase().includes('cerrado')
  const slaEnTiempo = hallazgos.filter(h => noCerrado(h) && h.dias_restantes > 7).length
  const slaEnRiesgo = hallazgos.filter(h => noCerrado(h) && h.dias_restantes >= 0 && h.dias_restantes <= 7).length
  const slaFuera = hallazgos.filter(h => noCerrado(h) && h.dias_restantes < 0).length
  const slaActivos = slaEnTiempo + slaEnRiesgo + slaFuera
  const slaPct = slaActivos > 0 ? Math.round((slaEnTiempo / slaActivos) * 100) : 0

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
            <KpiTile title="Act. pendientes" value={metricas?.evidencias_pendientes ?? 0} icon={Upload} subtitle="Sin completar" />
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
                    <RadialBarChart
                      data={[{ name: 'Cumplimiento', value: cumplimiento, fill: cumplimiento >= 70 ? '#22c55e' : cumplimiento >= 40 ? '#f59e0b' : '#ef4444' }]}
                      startAngle={90} endAngle={90 - (cumplimiento * 3.6)}
                      innerRadius={60} outerRadius={85} cx="50%" cy="50%"
                    >
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
            <TopRetrasadosCard data={topRetrasados} />
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
                            <td className="px-4 py-2.5">
                              <Badge className={PRIORIDAD_CONFIG[h.prioridad].color}>{PRIORIDAD_CONFIG[h.prioridad].label}</Badge>
                            </td>
                            <td className="px-4 py-2.5"><SemaforoBadge dias={h.dias_restantes} /></td>
                            <td className="px-4 py-2.5"><EstadoBadge estado={h.estado} /></td>
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
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <KpiTile title="En SLA" value={`${slaPct}%`} icon={Target} variant={slaPct >= 70 ? 'success' : 'danger'} subtitle="Cumplimiento" />
            <KpiTile title="En tiempo" value={slaEnTiempo} icon={CheckCircle2} variant="success" />
            <KpiTile title="En riesgo" value={slaEnRiesgo} icon={Clock} variant="warning" />
            <KpiTile title="Fuera SLA" value={slaFuera} icon={AlertTriangle} variant="danger" />
          </div>

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
