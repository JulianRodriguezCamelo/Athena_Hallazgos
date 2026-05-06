'use client'

import { useState } from 'react'
import {
  RefreshCw, FileWarning, Target, Activity, Layers,
  Clock, CheckCircle2, AlertTriangle, Shield, TrendingUp,
  ChevronRight, CalendarClock, ListChecks,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { KpiRow } from '@/components/molecules/KpiRow'
import { DonutChartCard } from '@/components/molecules/DonutChartCard'
import { ClosureGaugeCard } from '@/components/molecules/ClosureGaugeCard'
import { SemaforoBadge } from '@/components/atoms/SemaforoBadge'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import { ModalVerDetalle } from '@/components/organisms/modals/ModalVerDetalle'
import { useGestorData } from '@/hooks/useGestorData'
import { useAuth } from '@/lib/auth'
import { CHART_COLORS_HEX } from '@/types'
import type { HallazgoRow } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ColorBar(props: any) {
  const { x, y, width, height, fill } = props as { x: number; y: number; width: number; height: number; fill: string }
  if (!height || height <= 0) return null
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(value, 100)}%`, backgroundColor: color }}
      />
    </div>
  )
}

function HallazgoMiniRow({ h, onClick }: { h: HallazgoRow; onClick: () => void }) {
  const urgente = h.dias_restantes < 0
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group',
        urgente && 'bg-destructive/5 hover:bg-destructive/10',
      )}
    >
      <SemaforoBadge dias={h.dias_restantes} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{h.descripcion ?? '—'}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Código {h.codigo_del_hallazgo} · Cierre {fmtDate(h.fecha_cierre_proyectada)}
        </p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </button>
  )
}

export default function ProfesionalDashboard() {
  const { user } = useAuth()
  const {
    metricas, hallazgos, actividades, porEstado, porSemaforo,
    loading, refreshing, reload,
  } = useGestorData()
  const [detalleH, setDetalleH] = useState<HallazgoRow | null>(null)

  const total = metricas?.total ?? 0
  const cerradas = metricas?.cerradas ?? 0
  const cumplimiento = total > 0 ? Math.round((cerradas / total) * 100) : 0

  const vencidos = hallazgos.filter(h => h.dias_restantes < 0)
  const proximos = hallazgos.filter(h => h.dias_restantes >= 0 && h.dias_restantes <= 7)
  const activos = hallazgos.filter(h => !(h.estado ?? '').toLowerCase().includes('cerrado') && !(h.estado ?? '').toLowerCase().includes('cerrada'))

  // Actividades pendientes
  const actividadesPendientes = actividades.filter(a =>
    !['cerrado', 'completado', 'cumplido'].some(s => (a.estado_accion ?? '').toLowerCase().includes(s))
  )
  const actividadesVencidas = actividadesPendientes.filter(
    a => a.fecha_compromiso && new Date(a.fecha_compromiso) < new Date()
  )

  // Distribucion de actividades por estado para bar chart
  const estadosActividades = actividades.reduce((acc: Record<string, number>, a) => {
    const e = a.estado_accion ?? 'Sin estado'
    acc[e] = (acc[e] ?? 0) + 1
    return acc
  }, {})
  const barDataActividades = Object.entries(estadosActividades)
    .map(([name, value], i) => ({ name, value, fill: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

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

      {/* Gráficas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ClosureGaugeCard cumplimiento={cumplimiento} cerradas={cerradas} total={total} />
        <DonutChartCard
          title="Por Estado"
          description="Distribución de hallazgos"
          data={porEstado}
          centerLabel={String(total)}
          centerSubLabel="total"
        />
        <DonutChartCard
          title="Por Semáforo"
          description="Estado de tiempo"
          data={porSemaforo}
          centerLabel={String(activos.length)}
          centerSubLabel="activos"
        />
      </div>

      {/* Atención urgente + Próximos a vencer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vencidos */}
        <Card className="overflow-hidden">
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <CardTitle className="text-sm font-medium">Requieren Atención Inmediata</CardTitle>
              </div>
              {vencidos.length > 0
                ? <Badge variant="destructive">{vencidos.length} vencidos</Badge>
                : <Badge variant="secondary" className="text-green-600 bg-green-50">Al día</Badge>
              }
            </div>
            <CardDescription className="text-xs">Hallazgos fuera de plazo</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {vencidos.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Sin hallazgos vencidos
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
                {vencidos.slice(0, 8).map(h => (
                  <HallazgoMiniRow key={h.id} h={h} onClick={() => setDetalleH(h)} />
                ))}
                {vencidos.length > 8 && (
                  <p className="text-center text-xs text-muted-foreground py-2.5">
                    +{vencidos.length - 8} más en Gestión de Hallazgos
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos a vencer */}
        <Card className="overflow-hidden">
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-500" />
                <CardTitle className="text-sm font-medium">Próximos a Vencer</CardTitle>
              </div>
              <Badge variant="secondary" className="text-amber-700 bg-amber-50">{proximos.length} esta semana</Badge>
            </div>
            <CardDescription className="text-xs">Vencen en los próximos 7 días</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {proximos.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Ninguno vence en los próximos 7 días
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
                {proximos.slice(0, 8).map(h => (
                  <HallazgoMiniRow key={h.id} h={h} onClick={() => setDetalleH(h)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actividades + Barra de estados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Actividades pendientes */}
        <Card className="overflow-hidden">
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium">Mis Actividades Pendientes</CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                {actividadesVencidas.length > 0 && (
                  <Badge variant="destructive" className="text-[10px]">{actividadesVencidas.length} vencidas</Badge>
                )}
                <Badge variant="secondary">{actividadesPendientes.length}</Badge>
              </div>
            </div>
            <CardDescription className="text-xs">Acciones bajo tu responsabilidad sin cerrar</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {actividadesPendientes.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Todas las actividades al día
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
                {actividadesPendientes.slice(0, 8).map(a => {
                  const vencida = a.fecha_compromiso && new Date(a.fecha_compromiso) < new Date()
                  return (
                    <div key={a.id} className={cn(
                      'flex items-center gap-3 px-4 py-3',
                      vencida && 'bg-destructive/5',
                    )}>
                      <StatusBadge value={a.estado_accion} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{a.descripcion ?? '—'}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Hallazgo {a.codigo_del_hallazgo} · {a.fecha_compromiso ? fmtDate(a.fecha_compromiso) : 'Sin fecha'}
                        </p>
                      </div>
                      {vencida && <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                    </div>
                  )
                })}
                {actividadesPendientes.length > 8 && (
                  <p className="text-center text-xs text-muted-foreground py-2.5">
                    +{actividadesPendientes.length - 8} más
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribución de actividades por estado */}
        <Card className="overflow-hidden">
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-sm font-medium">Distribución de Actividades</CardTitle>
                <CardDescription className="text-xs">Por estado de avance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 pb-3">
            {barDataActividades.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                Sin actividades
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={barDataActividades} margin={{ top: 0, right: 8, left: -20, bottom: 0 }} style={{ background: 'transparent' }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + '…' : v}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid hsl(var(--border))' }}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Bar dataKey="value" shape={ColorBar} />
                  </BarChart>
                </ResponsiveContainer>
                {/* Progreso por estado */}
                <div className="mt-4 space-y-2.5">
                  {barDataActividades.map((item, i) => {
                    const pct = actividades.length > 0 ? Math.round((item.value / actividades.length) * 100) : 0
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="truncate max-w-[200px]">{item.name}</span>
                          <span className="font-medium tabular-nums">{item.value} ({pct}%)</span>
                        </div>
                        <ProgressBar value={pct} color={CHART_COLORS_HEX[i % CHART_COLORS_HEX.length]} />
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <ModalVerDetalle h={detalleH} open={!!detalleH} onClose={() => setDetalleH(null)} />
    </div>
  )
}
