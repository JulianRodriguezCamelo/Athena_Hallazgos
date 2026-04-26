'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { RefreshCw, ClipboardList, Target } from 'lucide-react'
import { actividadesApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { KpiTile } from '@/components/shared/KpiTile'
import { Pagination } from '@/components/shared/Pagination'
import { HallazgoCard } from '@/components/mis-actividades/HallazgoCard'
import { isCompletada, type ChecklistResponse, type HallazgoChecklist } from '@/components/mis-actividades/types'

export default function MisActividadesPage() {
  const pathname = usePathname()
  const { user, isDirectivo, isProfesional, isGestor } = useAuth()

  const [data, setData] = useState<ChecklistResponse | null>(null)
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

    let currentEstado: string | null = null
    setHallazgos(prev =>
      prev.map(h => {
        const idx = h.actividades.findIndex(a => a.id === actId)
        if (idx === -1) return h
        currentEstado = h.actividades[idx].estado_accion
        const newActs = h.actividades.map(a => a.id === actId ? { ...a, estado_accion: newEstado } : a)
        const completadas = newActs.filter(a => isCompletada(a.estado_accion)).length
        const total = newActs.length
        return { ...h, actividades: newActs, actividades_completadas: completadas, progreso: total > 0 ? Math.round((completadas / total) * 100) : 0 }
      })
    )

    prevState.current.set(actId, currentEstado)
    setUpdatingIds(s => new Set(s).add(actId))

    try {
      await actividadesApi.updateEstado(actId, newEstado)
    } catch {
      const original = prevState.current.get(actId) ?? null
      setHallazgos(prev =>
        prev.map(h => {
          const idx = h.actividades.findIndex(a => a.id === actId)
          if (idx === -1) return h
          const newActs = h.actividades.map(a => a.id === actId ? { ...a, estado_accion: original } : a)
          const completadas = newActs.filter(a => isCompletada(a.estado_accion)).length
          const total = newActs.length
          return { ...h, actividades: newActs, actividades_completadas: completadas, progreso: total > 0 ? Math.round((completadas / total) * 100) : 0 }
        })
      )
    } finally {
      setUpdatingIds(s => { const next = new Set(s); next.delete(actId); return next })
      prevState.current.delete(actId)
    }
  }, [])

  const kpiTotal = data?.total ?? 0
  const kpiVencidos = hallazgos.filter(h => h.dias_restantes !== null && h.dias_restantes < 0).length
  const kpiProximos = hallazgos.filter(h => h.dias_restantes !== null && h.dias_restantes >= 0 && h.dias_restantes <= 7).length
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
              {hallazgos.map(h => (
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
