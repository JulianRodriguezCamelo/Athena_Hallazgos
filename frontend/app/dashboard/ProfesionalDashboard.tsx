'use client'

import { useState } from 'react'
import {
  RefreshCw, FileWarning, Target, Activity, Layers,
  Clock, CheckCircle2, AlertTriangle, Calendar, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { KpiRow } from '@/components/molecules/KpiRow'
import { SemaforoBadge } from '@/components/atoms/SemaforoBadge'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import { ModalVerDetalle } from '@/components/organisms/modals/ModalVerDetalle'
import { useGestorData } from '@/hooks/useGestorData'
import { useAuth } from '@/lib/auth'
import type { HallazgoRow } from '@/types'

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProfesionalDashboard() {
  const { user } = useAuth()
  const { metricas, hallazgos, actividades, loading, refreshing, reload } = useGestorData()
  const [detalleH, setDetalleH] = useState<HallazgoRow | null>(null)

  const total = metricas?.total ?? 0
  const cerradas = metricas?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  const vencidos = hallazgos.filter(h => h.dias_restantes < 0)
  const proximos = hallazgos.filter(h => h.dias_restantes >= 0 && h.dias_restantes <= 7)
  const activos = hallazgos.filter(h => !(h.estado ?? '').toLowerCase().includes('cerrado'))

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
            <h1 className="text-2xl font-bold tracking-tight">Mi Panel de Trabajo</h1>
            <p className="text-sm text-muted-foreground">
              {user?.nombre} · <span className="font-medium">{user?.dependencia ?? 'Profesional'}</span>
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto" onClick={() => reload(true)} disabled={refreshing}>
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <KpiRow items={[
        { title: 'Asignados', value: total, icon: Layers, subtitle: 'Hallazgos a cargo' },
        { title: 'Vencidos', value: vencidos.length, icon: FileWarning, variant: 'danger', subtitle: 'Fuera de plazo' },
        { title: 'Próximos 7d', value: proximos.length, icon: Clock, variant: 'warning', subtitle: 'Requieren atención' },
        { title: 'Activos', value: activos.length, icon: Activity, variant: 'info', subtitle: 'Sin cerrar' },
        { title: 'Índice cierre', value: `${cumplimiento}%`, icon: Target, variant: cumplimiento >= 70 ? 'success' : 'danger', subtitle: `${cerradas}/${total} cerrados` },
      ]} columns={5} />

   

      {/* Mis hallazgos */}
      <Card className="overflow-hidden">
        <CardHeader className="px-5 py-3.5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Mis Hallazgos</CardTitle>
              <CardDescription className="text-xs">Asignados a tu nombre o dependencia</CardDescription>
            </div>
            <Badge variant="secondary">{hallazgos.length} registros</Badge>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {hallazgos.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              Sin hallazgos asignados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Código', 'Descripción', 'Semáforo', 'Estado', 'Responsable', 'Cierre', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hallazgos.map(h => (
                    <tr key={h.id} className={cn(
                      'hover:bg-muted/20 transition-colors',
                      h.dias_restantes < 0 && 'bg-destructive/5',
                      h.dias_restantes >= 0 && h.dias_restantes <= 7 && 'bg-amber-500/5',
                    )}>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-primary whitespace-nowrap">
                        {h.codigo_del_hallazgo ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 max-w-xs truncate text-foreground/80">{h.descripcion ?? '—'}</td>
                      <td className="px-4 py-2.5"><SemaforoBadge dias={h.dias_restantes} /></td>
                      <td className="px-4 py-2.5"><StatusBadge value={h.estado} /></td>
                      <td className="px-4 py-2.5 text-muted-foreground">{h.responsable_plan_accion ?? '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(h.fecha_cierre_proyectada)}</td>
                      <td className="px-4 py-2.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary"
                          onClick={() => setDetalleH(h)}
                        >
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mis actividades recientes */}
      {actividades.length > 0 && (
        <Card>
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Actividades Asignadas</CardTitle>
                <CardDescription className="text-xs">Acciones bajo tu responsabilidad</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{actividades.length}</Badge>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Hallazgo', 'Actividad', 'Estado', 'Responsable', 'Compromiso'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {actividades.slice(0, 20).map(a => {
                    const esPendiente = !['cerrado', 'completado', 'cumplido'].some(s =>
                      (a.estado_accion ?? '').toLowerCase().includes(s)
                    )
                    const fechaVencida = a.fecha_compromiso && new Date(a.fecha_compromiso) < new Date()
                    return (
                      <tr key={a.id} className={cn(
                        'hover:bg-muted/20 transition-colors',
                        esPendiente && fechaVencida && 'bg-destructive/5',
                      )}>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-primary whitespace-nowrap">
                          {a.codigo_del_hallazgo ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 max-w-xs truncate text-foreground/80">{a.descripcion ?? '—'}</td>
                        <td className="px-4 py-2.5"><StatusBadge value={a.estado_accion} /></td>
                        <td className="px-4 py-2.5 text-muted-foreground">{a.responsable_accion ?? a.responsable ?? '—'}</td>
                        <td className={cn('px-4 py-2.5 whitespace-nowrap', fechaVencida && esPendiente ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                          {a.fecha_compromiso ? fmtDate(a.fecha_compromiso) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ModalVerDetalle h={detalleH} open={!!detalleH} onClose={() => setDetalleH(null)} />
    </div>
  )
}
