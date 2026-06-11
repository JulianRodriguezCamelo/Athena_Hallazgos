'use client'

import { useState, useEffect, Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { FileSpreadsheet, ClipboardList, ListChecks, Download } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/Modal'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FiltersPanel } from '@/components/organisms/hallazgos/FiltersPanel'
import { HallazgosTable } from '@/components/organisms/hallazgos/HallazgosTable'
import { ActividadesTable } from '@/components/organisms/hallazgos/ActividadesTable'
import { ExcelAnalyzer } from '@/components/organisms/hallazgos/ExcelAnalyzer'
import { ActividadDetailModal } from '@/components/organisms/modals/ActividadDetailModal'
import { DetailField } from '@/components/atoms/DetailField'
import { FormattedText } from '@/components/atoms/FormattedText'
import { PageHeader } from '@/components/templates/PageHeader'
import { useHallazgosFilters } from '@/hooks/useHallazgosFilters'
import { useHallazgosData } from '@/hooks/useHallazgosData'
import { useActividadesData } from '@/hooks/useActividadesData'
import { useFilterOptions } from '@/hooks/useFilterOptions'
import { usePagination } from '@/hooks/usePagination'
import { hallazgosApi } from '@/lib/api'
import { NotasMensualesInline } from '@/components/organisms/hallazgos/NotasMensualesInline'
import { useAuth } from '@/lib/auth'
import { History, Lock } from 'lucide-react'
import type { Hallazgo, Actividad } from '@/types'

interface HistoryEntry {
  id: number
  usuario: string
  action: string
  changes: Record<string, [unknown, unknown]>
  created_at: string
}

function HistorialTab({ hallazgoId }: { hallazgoId: number }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    hallazgosApi.history(hallazgoId)
      .then(res => {
        if (cancelled) return
        const d = res.data as { history: HistoryEntry[] }
        setEntries(d.history ?? [])
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [hallazgoId])

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Cargando historial…</div>

  if (entries.length === 0) return (
    <div className="py-12 text-center">
      <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">No hay cambios registrados aún.</p>
    </div>
  )

  const FIELD_LABELS: Record<string, string> = {
    estado: 'Estado', estado_plan_accion: 'Estado plan', estado_accion: 'Estado acción',
    responsable_plan_accion: 'Responsable plan', responsable_accion: 'Responsable acción',
    fecha_cierre_proyectada: 'Fecha cierre proyectada', prorroga: 'Prórroga',
    fecha_cierre_final_prorroga: 'Fecha cierre prórroga', observaciones: 'Observaciones',
  }

  return (
    <div className="space-y-3">
      {entries.map(e => {
        const campos = Object.entries(e.changes)
        return (
          <div key={e.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/60">
              <span className="text-xs font-semibold text-foreground">{e.usuario}</span>
              <span className="text-[11px] text-muted-foreground">
                {new Date(e.created_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            {campos.length > 0 ? (
              <div className="divide-y divide-border/50">
                {campos.map(([campo, [antes, despues]]) => (
                  <div key={campo} className="px-4 py-2.5 grid grid-cols-[auto_1fr_1fr] gap-3 text-xs items-start">
                    <span className="font-medium text-muted-foreground pt-0.5 min-w-[120px]">
                      {FIELD_LABELS[campo] ?? campo}
                    </span>
                    <span className="line-through text-destructive/70 break-words">{String(antes ?? '—')}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 break-words">{String(despues ?? '—')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-2.5 text-xs text-muted-foreground">{e.action}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

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
            <p className="flex-1 min-w-0 text-sm font-medium text-foreground leading-snug">{act.descripcion ?? '—'}</p>
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
              <div className="bg-muted/40 rounded-lg p-3"><FormattedText value={act.observaciones} /></div>
            </div>
          )}
          <div className="px-4 pb-3">
            <NotasMensualesInline
              actividadId={act.id}
              sinNotaMensual={act.sin_nota_mensual}
              ultimaNotaAt={act.ultima_nota_at}
              defaultExpanded={act.sin_nota_mensual}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function HallazgosPageInner() {
  const pathname = usePathname()
  const { isDirectivo, isVice, isAdmin } = useAuth()
  const canEdit = isDirectivo || isVice || isAdmin
  const [activeMainTab, setActiveMainTab] = useState<'hallazgos' | 'actividades'>('hallazgos')
  const [showAnalyzer, setShowAnalyzer] = useState(false)
  const [selectedHallazgo, setSelectedHallazgo] = useState<Hallazgo | null>(null)
  const [selectedActividad, setSelectedActividad] = useState<Actividad | null>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'actividades' | 'historial'>('info')
  const [exporting, setExporting] = useState(false)

  async function handleExport(fmt: 'csv' | 'xlsx') {
    setExporting(true)
    try {
      const params: Record<string, unknown> = {
        estado: filters.estado,
        dependencia: filters.dependencia,
        vicepresidencia: filters.vicepresidencia,
        direccion: filters.direccion,
        responsable: filters.responsable,
        estado_plan_accion: filters.estadoPlan,
        search: debouncedSearch,
        vencido: filters.vencido ? 'true' : undefined,
        con_prorroga: filters.conProrroga ? 'true' : undefined,
        fecha_cierre_desde: filters.fechaCierreDesde,
        fecha_cierre_hasta: filters.fechaCierreHasta,
        fecha_inicial_desde: filters.fechaInicialDesde,
        fecha_inicial_hasta: filters.fechaInicialHasta,
      }
      await hallazgosApi.export(params, fmt)
    } catch {
      // silencioso — el fetch ya muestra errores en consola
    } finally {
      setExporting(false)
    }
  }

  const filterState = useHallazgosFilters()
  const { filters, setFilter, clearAll, hasFilters, activeFiltersCount, debouncedSearch } = filterState

  const { page: hPage, setPage: setHPage, resetPage: resetHPage } = usePagination()
  const { page: aPage, setPage: setAPage, resetPage: resetAPage } = usePagination()

  const options = useFilterOptions()

  const { hallazgos, meta: hMeta, loading: hLoading } = useHallazgosData({
    filters, debouncedSearch, page: hPage,
  })
  const { actividades, meta: aMeta, loading: aLoading } = useActividadesData({
    filters, debouncedSearch, page: aPage,
  })

  useEffect(() => {
    resetHPage()
    resetAPage()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.estado, filters.dependencia, filters.vicepresidencia,
      filters.direccion, filters.responsable, filters.estadoPlan, filters.vencido,
      filters.conProrroga, filters.fechaCierreDesde, filters.fechaCierreHasta,
      filters.fechaInicialDesde, filters.fechaInicialHasta])

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-6">
        <PageHeader
          title="Gestión de Hallazgos"
          description="Administra y da seguimiento a los hallazgos y actividades del sistema"
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleExport('csv')}
                disabled={exporting}
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exportando…' : 'CSV'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleExport('xlsx')}
                disabled={exporting}
              >
                <Download className="w-4 h-4" />
                Excel
              </Button>
              <Button variant={showAnalyzer ? 'secondary' : 'outline'} size="sm" onClick={() => setShowAnalyzer(!showAnalyzer)} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Analizar Excel
              </Button>
            </div>
          }
        />

        {showAnalyzer && <ExcelAnalyzer onClose={() => setShowAnalyzer(false)} />}

        <Tabs value={activeMainTab} onValueChange={(v) => setActiveMainTab(v as 'hallazgos' | 'actividades')}>
          <TabsList className="h-11">
            <TabsTrigger value="hallazgos" className="gap-2 px-4">
              <ClipboardList className="w-4 h-4" />
              Hallazgos
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{hMeta.total}</Badge>
            </TabsTrigger>
            <TabsTrigger value="actividades" className="gap-2 px-4">
              <ListChecks className="w-4 h-4" />
              Actividades
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{aMeta.total}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <FiltersPanel
              filters={filters}
              setFilter={setFilter}
              clearAll={clearAll}
              hasFilters={hasFilters}
              activeFiltersCount={activeFiltersCount}
              options={options}
              total={activeMainTab === 'hallazgos' ? hMeta.total : aMeta.total}
            />
          </div>

          <TabsContent value="hallazgos" className="mt-4">
            <Card className="overflow-hidden">
              <HallazgosTable
                hallazgos={hallazgos}
                loading={hLoading}
                meta={hMeta}
                page={hPage}
                setPage={setHPage}
                onSelect={(h) => { setSelectedHallazgo(h); setActiveDetailTab('info') }}
              />
            </Card>
          </TabsContent>

          <TabsContent value="actividades" className="mt-4">
            <Card className="overflow-hidden">
              <ActividadesTable
                actividades={actividades}
                loading={aLoading}
                meta={aMeta}
                page={aPage}
                setPage={setAPage}
                onSelect={setSelectedActividad}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Modal
        open={!!selectedHallazgo}
        onClose={() => setSelectedHallazgo(null)}
        title={`Hallazgo ${selectedHallazgo?.codigo_del_hallazgo ?? ''}`}
        size="2xl"
      >
        {selectedHallazgo && (
          <div className="space-y-4">
            <div className="flex border-b border-border">
              {(['info', 'actividades', 'historial'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveDetailTab(tab)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5',
                    activeDetailTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'info' ? 'Información' : tab === 'actividades' ? 'Actividades' : (
                    <><History className="w-3.5 h-3.5" />Historial</>
                  )}
                </button>
              ))}
            </div>

            {activeDetailTab === 'info' && (
              <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
                {!canEdit && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/60 border border-border px-3 py-2 text-xs text-muted-foreground">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    Solo los directivos pueden editar este hallazgo.
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Descripción</p>
                  <div className="bg-muted/50 rounded-lg p-4"><FormattedText value={selectedHallazgo.descripcion} /></div>
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
                    <p className="text-xs font-semibond text-muted-foreground uppercase tracking-wide mb-2">Observaciones</p>
                    <div className="bg-muted/50 rounded-lg p-4"><FormattedText value={selectedHallazgo.observaciones} /></div>
                  </div>
                )}
              </div>
            )}

            {activeDetailTab === 'actividades' && (
              <div className="max-h-[65vh] overflow-y-auto pr-1">
                <ActividadesModalTab hallazgoId={selectedHallazgo.id} />
              </div>
            )}

            {activeDetailTab === 'historial' && (
              <div className="max-h-[65vh] overflow-y-auto pr-1">
                <HistorialTab hallazgoId={selectedHallazgo.id} />
              </div>
            )}
          </div>
        )}
      </Modal>

      <ActividadDetailModal actividad={selectedActividad} onClose={() => setSelectedActividad(null)} readOnly />
    </DashboardShell>
  )
}

export default function HallazgosPage() {
  return (
    <Suspense>
      <HallazgosPageInner />
    </Suspense>
  )
}
