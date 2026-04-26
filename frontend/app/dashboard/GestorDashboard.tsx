'use client'

import { useState } from 'react'
import {
  Clock, Calendar, RefreshCw, FileWarning, Target, Activity,
  BarChart3, Layers, AlertTriangle, CheckCircle2, Play, Upload,
  FileText, Bell, Search, Filter, MoreVertical, Eye, Edit3, Shield,
} from 'lucide-react'
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
import { HallazgoCard } from '@/components/organisms/hallazgos/HallazgoCard'
import { AlertCard } from '@/components/organisms/hallazgos/AlertCard'
import { ModalVerDetalle, ModalEditarPlan, ModalSubirEvidencia, ModalCambiarEstado, ModalSolicitarProrroga } from '@/components/organisms/modals'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import { SemaforoBadge } from '@/components/atoms/SemaforoBadge'
import { useGestorData } from '@/hooks/useGestorData'
import { useAuth } from '@/lib/auth'
import { PRIORIDAD_CONFIG } from '@/types'
import type { HallazgoRow, ActividadRow, HallazgoWithActividades } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CARDS_PER_PAGE = 9
const H_PAGE_SIZE = 10
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
  const [searchH, setSearchH] = useState('')
  const [searchA, setSearchA] = useState('')
  const [hPage, setHPage] = useState(1)
  const [aPage, setAPage] = useState(1)
  const [vPage, setVPage] = useState(1)
  const [pPage, setPPage] = useState(1)
  const [modalOpen, setModalOpen] = useState<ModalType>(null)
  const [modalHallazgo, setModalHallazgo] = useState<HallazgoRow | null>(null)

  function openModal(type: ModalType, h: HallazgoRow) { setModalHallazgo(h); setModalOpen(type) }
  function closeModal() { setModalOpen(null) }

  const total = metricas?.total ?? 0
  const cerradas = metricas?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0
  const hallazgosConActividades = groupActivitiesByHallazgo(actividades, hallazgos)

  function onSearchH(val: string) { setSearchH(val); setHPage(1) }
  function onSearchA(val: string) { setSearchA(val); setAPage(1) }

  const filtH = hallazgos.filter(h => {
    const t = searchH.toLowerCase()
    return (h.codigo_del_hallazgo ?? '').toLowerCase().includes(t) ||
      (h.descripcion ?? '').toLowerCase().includes(t) ||
      (h.responsable_plan_accion ?? '').toLowerCase().includes(t)
  })
  const pagedH = filtH.slice((hPage - 1) * H_PAGE_SIZE, hPage * H_PAGE_SIZE)

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
          <Dialog>
            <DialogTrigger render={<Button size="sm" className="gap-2" />}>
              <FileText className="h-3.5 w-3.5" />Nuevo Plan
            </DialogTrigger>
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
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Resumen</span></TabsTrigger>
          <TabsTrigger value="hallazgos" className="gap-2"><FileWarning className="h-4 w-4" /><span className="hidden sm:inline">Hallazgos</span></TabsTrigger>
          <TabsTrigger value="actividades" className="gap-2"><Activity className="h-4 w-4" /><span className="hidden sm:inline">Actividades</span></TabsTrigger>
          <TabsTrigger value="seguimiento" className="gap-2"><Bell className="h-4 w-4" /><span className="hidden sm:inline">Seguimiento</span></TabsTrigger>
        </TabsList>

        {/* ── RESUMEN ── */}
        <TabsContent value="overview" className="space-y-6">
          <KpiRow items={[
            { title: 'Total a cargo', value: metricas?.total ?? 0, icon: Layers, subtitle: 'Hallazgos en gestión' },
            { title: 'En Proceso', value: metricas?.en_proceso ?? 0, icon: Play, variant: 'info', subtitle: 'Ejecutándose' },
            { title: 'Vencidos', value: metricas?.vencidos ?? 0, icon: FileWarning, variant: 'danger', subtitle: 'Requieren atención' },
            { title: 'Próximos', value: metricas?.proximos_vencer ?? 0, icon: Clock, variant: 'warning', subtitle: 'Próximos 7 días' },
            { title: 'Índice cierre', value: `${cumplimiento}%`, icon: Target, variant: cumplimiento >= 70 ? 'success' : 'danger', subtitle: `${cerradas}/${total} cerrados` },
          ]} columns={5} />
          <KpiRow items={[
            { title: 'Act. pendientes', value: metricas?.evidencias_pendientes ?? 0, icon: Upload, subtitle: 'Sin completar' },
            { title: 'En validación', value: metricas?.pendientes_validacion ?? 0, icon: Shield, variant: 'info' },
            { title: 'Con prórroga', value: metricas?.con_prorroga ?? 0, icon: Calendar },
            { title: 'Mis actividades', value: metricas?.mis_actividades ?? 0, icon: Activity },
          ]} columns={4} />
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
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar código, descripción o responsable..." className="pl-9" value={searchH} onChange={e => onSearchH(e.target.value)} />
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
                            <td className="px-4 py-2.5"><SemaforoBadge dias={h.dias_restantes} /></td>
                            <td className="px-4 py-2.5"><StatusBadge value={h.estado} /></td>
                            <td className="px-4 py-2.5 text-muted-foreground">{h.responsable_plan_accion ?? '—'}</td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(h.fecha_cierre_proyectada)}</td>
                            <td className="px-4 py-2.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>} />
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
                    <Pagination page={hPage} pages={Math.ceil(filtH.length / H_PAGE_SIZE)} onChange={setHPage} />
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
            <ResponsablesCriticosCard responsables={responsablesCriticos} />
            <BitacoraCard entries={bitacora} />
          </div>
        </TabsContent>
      </Tabs>

      <ModalVerDetalle h={modalHallazgo} open={modalOpen === 'detalle'} onClose={closeModal} />
      <ModalEditarPlan h={modalHallazgo} open={modalOpen === 'editar'} onClose={closeModal} onSaved={() => reload(true)} />
      <ModalSubirEvidencia h={modalHallazgo} open={modalOpen === 'evidencia'} onClose={closeModal} />
      <ModalCambiarEstado h={modalHallazgo} open={modalOpen === 'estado'} onClose={closeModal} onSaved={() => reload(true)} />
      <ModalSolicitarProrroga h={modalHallazgo} open={modalOpen === 'prorroga'} onClose={closeModal} onSaved={() => reload(true)} />
    </div>
  )
}
