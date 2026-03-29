'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Search, X, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { hallazgosApi } from '@/lib/api'
import { formatDate, getEstadoColor, cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import DashboardShell from '@/components/layout/DashboardShell'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Select from '@/components/ui/Select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Hallazgo {
  id: number
  codigo_evento: string | null
  descripcion: string | null
  fecha_inicial_evento: string | null
  fecha_cierre_proyectada: string | null
  vicepresidencia: string | null
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

function ActividadesTab({ hallazgoId }: { hallazgoId: number }) {
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

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
    <div className="space-y-2">
      {actividades.map((act, idx) => (
        <div key={act.id} className="rounded-lg border border-border overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/60 transition-colors text-left"
            onClick={() => setExpanded(expanded === idx ? null : idx)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-mono text-primary shrink-0">
                {act.id_plan_accion ?? `Actividad ${idx + 1}`}
              </span>
              <span className="text-sm text-foreground truncate">
                {act.nombre_plan_accion ?? act.descripcion ?? '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {act.estado_plan_accion && <StatusBadge value={act.estado_plan_accion} />}
              {expanded === idx
                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
          {expanded === idx && (
            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border bg-background">
              <DetailField label="ID Plan" value={act.id_plan_accion} />
              <DetailField label="Estado plan" value={act.estado_plan_accion} />
              <DetailField label="Responsable plan" value={act.responsable} />
              <DetailField label="Estado acción" value={act.estado_accion} />
              <DetailField label="Responsable acción" value={act.responsable_accion} />
              <DetailField label="Fecha compromiso" value={formatDate(act.fecha_compromiso)} />
              <DetailField label="Prórroga" value={act.prorroga} />
              <DetailField label="Fecha prórroga" value={formatDate(act.fecha_prorroga)} />
              {act.descripcion && (
                <div className="col-span-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Descripción</p>
                  <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{act.descripcion}</p>
                </div>
              )}
              {act.observaciones && (
                <div className="col-span-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Observaciones</p>
                  <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{act.observaciones}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function HallazgosPage() {
  const pathname = usePathname()
  const { user } = useAuth()
  const isVice = user?.rol === 'vicepresidente'

  const [hallazgos, setHallazgos] = useState<Hallazgo[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, pages: 1, page: 1 })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Hallazgo | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'actividades'>('info')

  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [vicepresidencia, setVicepresidencia] = useState('')
  const [dependencia, setDependencia] = useState('')
  const [responsable, setResponsable] = useState('')
  const [estadoPlan, setEstadoPlan] = useState('')
  
  const [estados, setEstados] = useState<string[]>([])
  const [vicepresidencias, setVicepresidencias] = useState<string[]>([])
  const [dependencias, setDependencias] = useState<string[]>([])
  const [responsables, setResponsables] = useState<string[]>([])
  const [estadosPlan, setEstadosPlan] = useState<string[]>([])
  const [page, setPage] = useState(1)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await hallazgosApi.list({
        page: p,
        per_page: 15,
        ...(search && { search }),
        ...(estado && { estado }),
        ...(vicepresidencia && { vicepresidencia }),
        ...(dependencia && { dependencia }),
        ...(responsable && { responsable }),
        ...(estadoPlan && { estado_plan_accion: estadoPlan }),
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
  }, [search, estado, vicepresidencia, dependencia, responsable, estadoPlan])

  useEffect(() => {
    hallazgosApi.estados().then((r) => {
      const d = r.data as { estados: string[] }
      setEstados(d.estados)
    }).catch(() => {})

    hallazgosApi.dependencias().then((r) => {
      const d = r.data as { dependencias: string[] }
      setDependencias(d.dependencias)
    }).catch(() => {})

    hallazgosApi.responsables().then((r) => {
      const d = r.data as { responsables: string[] }
      setResponsables(d.responsables)
    }).catch(() => {})

    hallazgosApi.estadosPlan().then((r) => {
      const d = r.data as { estados_plan_accion: string[] }
      setEstadosPlan(d.estados_plan_accion)
    }).catch(() => {})

    if (isVice) {
      hallazgosApi.vicepresidencias().then((r) => {
        const d = r.data as { vicepresidencias: string[] }
        setVicepresidencias(d.vicepresidencias)
      }).catch(() => {})
    }
  }, [isVice])

  useEffect(() => { load(page) }, [page]) // eslint-disable-line
  useEffect(() => { setPage(1); load(1) }, [search, estado, vicepresidencia, dependencia, responsable, estadoPlan]) // eslint-disable-line

  const hasFilters = !!search || !!estado || !!vicepresidencia || !!dependencia || !!responsable || !!estadoPlan
  const estadoOptions = estados.map((e) => ({ value: e, label: e }))
  const vpOptions = vicepresidencias.map((v) => ({ value: v, label: v }))
  const depOptions = dependencias.map((d) => ({ value: d, label: d }))
  const respOptions = responsables.map((r) => ({ value: r, label: r }))
  const estadoPlanOptions = estadosPlan.map((e) => ({ value: e, label: e }))

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-4">

        {/* Toolbar */}
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            {/* Search */}
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código, descripción…"
                className="pl-9"
              />
            </div>

            {/* Estado filter */}
            <div className="min-w-44">
              <Select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                options={estadoOptions}
                placeholder="Todos los estados"
              />
            </div>

            {/* Vicepresidencia filter (solo VP) */}
            {isVice && vpOptions.length > 0 && (
              <div className="min-w-56">
                <Select
                  value={vicepresidencia}
                  onChange={(e) => setVicepresidencia(e.target.value)}
                  options={vpOptions}
                  placeholder="Todas las vicepresidencias"
                />
              </div>
            )}

            <div className="min-w-44">
              <Select
                value={dependencia}
                onChange={(e) => setDependencia(e.target.value)}
                options={depOptions}
                placeholder="Todas las dependencias"
              />
            </div>

            <div className="min-w-56">
              <Select
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                options={respOptions}
                placeholder="Todos los responsables"
              />
            </div>

            <div className="min-w-44">
              <Select
                value={estadoPlan}
                onChange={(e) => setEstadoPlan(e.target.value)}
                options={estadoPlanOptions}
                placeholder="Todos los estados de plan"
              />
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setEstado(''); setVicepresidencia(''); setDependencia(''); setResponsable(''); setEstadoPlan('') }}>
                <X className="w-3.5 h-3.5" />
                Limpiar
              </Button>
            )}

            <span className="ml-auto text-xs text-muted-foreground self-center">
              {meta.total} registro{meta.total !== 1 ? 's' : ''}
            </span>
          </CardContent>
        </Card>

        {/* Table */}
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
                    {['Código', 'Descripción', 'Vicepresidencia', 'Dependencia', 'Estado',
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
                        {h.codigo_evento ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-foreground text-sm" title={h.descripcion ?? ''}>
                          {h.descripcion ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-xs max-w-[120px]">
                        <p className="truncate" title={h.vicepresidencia ?? ''}>
                          {h.vicepresidencia ?? '—'}
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
                  {Array.from({ length: Math.min(5, meta.pages) }, (_, i) => {
                    const p = i + 1
                    return (
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
                  })}
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
        title={`Hallazgo ${selected?.codigo_evento ?? ''}`}
        size="xl"
      >
        {selected && (
          <div className="space-y-4">
            {/* Tabs */}
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
                  <DetailField label="Código del evento"      value={selected.codigo_evento} />
                  <DetailField label="Estado"                 value={selected.estado} />
                  <DetailField label="Vicepresidencia"        value={selected.vicepresidencia} />
                  <DetailField label="Dependencia ERO"        value={selected.dependencia_reporta_ero} />
                  <DetailField label="Reportado para"         value={selected.reportado_para} />
                  <DetailField label="Reportado por"          value={selected.reportado_por} />
                  <DetailField label="Aplicativo afecta ERO"  value={selected.aplicativo_afecta_ero} />
                  <DetailField label="Fecha inicial"          value={formatDate(selected.fecha_inicial_evento)} />
                  <DetailField label="Fecha finalización"     value={formatDate(selected.fecha_finalizacion_evento)} />
                  <DetailField label="Fecha cierre proyectada" value={formatDate(selected.fecha_cierre_proyectada)} />
                  <DetailField label="Prórroga"               value={selected.prorroga} />
                  <DetailField label="Fecha cierre prórroga"  value={formatDate(selected.fecha_cierre_final_prorroga)} />
                </div>

                {/* Plan de acción */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2.5 border-b border-border">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                      Plan de acción principal
                    </p>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-4">
                    <DetailField label="ID Plan"             value={selected.id_plan_accion} />
                    <DetailField label="Estado plan"         value={selected.estado_plan_accion} />
                    <DetailField label="Responsable plan"    value={selected.responsable_plan_accion} />
                    <DetailField label="Estado acción"       value={selected.estado_accion} />
                    <DetailField label="Responsable acción"  value={selected.responsable_accion} />
                    <DetailField label="Nombre del plan"     value={selected.nombre_plan_accion} />
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
