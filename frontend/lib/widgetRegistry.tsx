'use client'

import type { ReactNode } from 'react'
import {
  AlertTriangle, CheckCircle2, Clock, FileWarning, ListChecks,
  Calendar, Zap, Target, TrendingUp, BarChart3, Activity, Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis,
  Line, LineChart, Cell,
} from 'recharts'
import { KpiOverviewSection } from '@/components/organisms/dashboard/KpiOverviewSection'
import { KpiRow } from '@/components/molecules/KpiRow'
import { DonutChartCard } from '@/components/molecules/DonutChartCard'
import { ClosureGaugeCard } from '@/components/molecules/ClosureGaugeCard'
import { AlertasCriticasPanel } from '@/components/organisms/dashboard/AlertasCriticasPanel'
import { EstadoAccionesCard } from '@/components/organisms/dashboard/EstadoAccionesCard'
import { DirectivoHallazgosTable } from '@/components/organisms/dashboard/DirectivoHallazgosTable'
import { TopResponsablesCard } from '@/components/organisms/dashboard/TopResponsablesCard'
import { CargasRecientesCard } from '@/components/organisms/dashboard/CargasRecientesCard'
import { EmptyChart } from '@/components/atoms/EmptyChart'
import type { WidgetType, DashboardBlock, Metrics, MetricasDirectivo, ChartItem, TimelineItem, UploadItem, PagedHallazgos } from '@/types'
import { CHART_COLORS_HEX } from '@/types'

// ─── Render context ────────────────────────────────────────────────────────────

export interface WidgetRenderContext {
  role: 'vicepresidente' | 'directivo' | 'administrador'
  vp?: {
    metrics: Metrics | null
    porEstado: ChartItem[]
    porEstadoPlan: ChartItem[]
    porDependencia: ChartItem[]
    porResponsable: ChartItem[]
    timeline: TimelineItem[]
    uploads: UploadItem[]
    cumplimiento: number
    total: number
    isVice: boolean
  }
  directivo?: {
    metricas: MetricasDirectivo | null
    porEstado: ChartItem[]
    porEstadoPlan: ChartItem[]
    porEstadoAccion: ChartItem[]
    hallazgos: PagedHallazgos | null
    hPage: number
    setHPage: (p: number) => void
    cumplimiento: number
    total: number
    reload: (refresh?: boolean) => void
  }
}

// ─── Widget metadata ───────────────────────────────────────────────────────────

export interface WidgetMeta {
  label: string
  description: string
  defaultSize: { w: number; h: number }
  roles: ('vicepresidente' | 'directivo' | 'administrador')[]
  group: 'kpi' | 'chart' | 'table' | 'panel'
}

// ─── Inline sub-components ─────────────────────────────────────────────────────

const TREND_DATA = [
  { month: 'Ene', cerrados: 4, abiertos: 8 }, { month: 'Feb', cerrados: 6, abiertos: 7 },
  { month: 'Mar', cerrados: 5, abiertos: 9 }, { month: 'Abr', cerrados: 8, abiertos: 6 },
  { month: 'May', cerrados: 7, abiertos: 5 }, { month: 'Jun', cerrados: 9, abiertos: 4 },
]

function EvolucionWidget({ timeline }: { timeline: TimelineItem[] }) {
  const data = timeline.map((d) => ({ mes: d.name, cerrados: d.value }))
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Evolución Mensual</CardTitle>
            <CardDescription className="text-xs">Hallazgos cerrados por mes (12 meses)</CardDescription>
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChart /> : (
          <ChartContainer config={{ cerrados: { label: 'Cerrados', color: 'var(--chart-2)' } }} className="h-[220px] w-full">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillCerradosW" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="var(--muted-foreground)" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="cerrados" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#fillCerradosW)" />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function ResponsableBarWidget({ data, isVice }: { data: ChartItem[]; isVice: boolean }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">
              {isVice ? 'Hallazgos por Vicepresidencia' : 'Hallazgos por Responsable'}
            </CardTitle>
            <CardDescription className="text-xs">
              {isVice ? 'Distribución por Vicepresidencia' : 'Top responsables asignados'}
            </CardDescription>
          </div>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChart /> : (
          <ChartContainer config={{ value: { label: 'Hallazgos', color: 'var(--chart-1)' } }} className="h-[220px] w-full">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} vertical />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={10} width={110} stroke="var(--muted-foreground)"
                tickFormatter={(v: string) => v.length > 14 ? `${v.slice(0, 14)}…` : v} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function TendenciaDirectivoWidget() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Tendencia de Cierre</CardTitle>
            <CardDescription className="text-xs">Evolución de los últimos 6 meses</CardDescription>
          </div>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{ cerrados: { label: 'Cerrados', color: '#22c55e' }, abiertos: { label: 'Abiertos', color: '#f59e0b' } }} className="h-[220px] w-full">
          <AreaChart data={TREND_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCerradosTW" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAbiertosTW" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="cerrados" stroke="#22c55e" strokeWidth={2} fill="url(#colorCerradosTW)" />
            <Area type="monotone" dataKey="abiertos" stroke="#f59e0b" strokeWidth={2} fill="url(#colorAbiertosTW)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

function BarEstadoWidget({ data, title }: { data: ChartItem[]; title: string }) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <CardDescription className="text-xs">Distribución de hallazgos por estado</CardDescription>
          </div>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChart /> : (
          <ChartContainer
            config={Object.fromEntries(data.map((d, i) => [d.name, { label: d.name, color: CHART_COLORS_HEX[i % 5] }]))}
            className="h-[200px] w-full"
          >
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} stroke="var(--muted-foreground)"
                angle={-30} textAnchor="end" interval={0} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                {data.map((d, i) => <Cell key={d.name} fill={d.fill ?? CHART_COLORS_HEX[i % 5]} />)}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function BarDependenciaWidget({ data }: { data: ChartItem[] }) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Por Dependencia</CardTitle>
            <CardDescription className="text-xs">Hallazgos por dependencia organizacional</CardDescription>
          </div>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChart /> : (
          <ChartContainer config={{ value: { label: 'Hallazgos', color: CHART_COLORS_HEX[0] } }} className="h-[200px] w-full">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} vertical />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} fontSize={10} width={120}
                stroke="var(--muted-foreground)" tickFormatter={(v: string) => v.length > 16 ? `${v.slice(0, 16)}…` : v} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                {data.map((d, i) => <Cell key={d.name} fill={CHART_COLORS_HEX[i % 5]} />)}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function LineEvolucionWidget({ timeline }: { timeline: TimelineItem[] }) {
  const data = timeline.map((d) => ({ mes: d.name, cerrados: d.value }))
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Línea de Evolución</CardTitle>
            <CardDescription className="text-xs">Hallazgos cerrados por mes (12 meses)</CardDescription>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChart /> : (
          <ChartContainer config={{ cerrados: { label: 'Cerrados', color: 'var(--chart-1)' } }} className="h-[200px] w-full">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="var(--muted-foreground)" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="cerrados" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function KpiVencidosWidget({ vencidos, prorroga, abiertas, cerradas }: { vencidos: number; prorroga: number; abiertas: number; cerradas: number }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-1 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Resumen de Vencimientos</CardTitle>
            <CardDescription className="text-xs">Estado crítico de hallazgos</CardDescription>
          </div>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Vencidos', value: vencidos, color: 'text-destructive', bg: 'bg-destructive/10' },
            { label: 'Con Prórroga', value: prorroga, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Abiertas', value: abiertas, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Cerradas', value: cerradas, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-lg p-2.5 ${bg} flex flex-col gap-0.5`}>
              <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
              <span className={`text-xl font-bold leading-tight ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function BarAccionDirectivoWidget({ data }: { data: ChartItem[] }) {
  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Acciones por Estado</CardTitle>
            <CardDescription className="text-xs">Barras: distribución del estado de mis acciones</CardDescription>
          </div>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChart /> : (
          <ChartContainer
            config={Object.fromEntries(data.map((d, i) => [d.name, { label: d.name, color: CHART_COLORS_HEX[i % 5] }]))}
            className="h-[200px] w-full"
          >
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} stroke="var(--muted-foreground)"
                angle={-30} textAnchor="end" interval={0} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28}>
                {data.map((d, i) => <Cell key={d.name} fill={d.fill ?? CHART_COLORS_HEX[i % 5]} />)}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Registry entry type ───────────────────────────────────────────────────────

interface WidgetRegistryEntry {
  meta: WidgetMeta
  render: (ctx: WidgetRenderContext, block: DashboardBlock) => ReactNode
}

// ─── Widget Registry ───────────────────────────────────────────────────────────

export const WIDGET_REGISTRY: Record<WidgetType, WidgetRegistryEntry> = {
  'kpi-row-primary': {
    meta: {
      label: 'KPIs Principales',
      description: 'Total, abiertas, vencidas y cerradas',
      defaultSize: { w: 12, h: 2 },
      roles: ['vicepresidente', 'directivo', 'administrador'],
      group: 'kpi',
    },
    render: (ctx) => {
      if (ctx.role === 'vicepresidente' && ctx.vp) {
        const { metrics, total, cumplimiento } = ctx.vp
        const cerradas = metrics?.cerradas ?? 0
        return (
          <KpiOverviewSection primaryItems={[
            { title: 'Total Hallazgos', value: total, icon: AlertTriangle },
            { title: 'Abiertas', value: metrics?.abiertas ?? 0, icon: Clock, variant: 'warning', subtitle: 'Pendientes de cierre' },
            { title: 'Vencidas', value: metrics?.vencidos ?? 0, icon: FileWarning, variant: 'danger' },
            { title: 'Cerradas', value: cerradas, icon: CheckCircle2, variant: 'success', trend: metrics?.cerradas_hoy },
          ]} />
        )
      }
      if (ctx.role === 'directivo' && ctx.directivo) {
        const { metricas, total, cumplimiento } = ctx.directivo
        return (
          <KpiRow items={[
            { title: 'A mi cargo', value: total, icon: Layers, subtitle: 'Hallazgos totales' },
            { title: 'Abiertas', value: metricas?.abiertas ?? 0, icon: Clock, variant: 'warning', subtitle: 'Requieren atención' },
            { title: 'Vencidas', value: metricas?.vencidos ?? 0, icon: FileWarning, variant: 'danger', subtitle: 'Fuera de plazo' },
            { title: 'Con Prórroga', value: metricas?.con_prorroga ?? 0, icon: Calendar, subtitle: 'Extensión solicitada' },
            { title: 'Actividades', value: metricas?.mis_actividades ?? 0, icon: Activity, subtitle: 'Acciones asignadas' },
            { title: 'Índice cierre', value: `${cumplimiento}%`, icon: Target, variant: cumplimiento >= 70 ? 'success' : cumplimiento >= 40 ? 'warning' : 'danger' },
          ]} columns={6} />
        )
      }
      return null
    },
  },

  'kpi-row-secondary': {
    meta: {
      label: 'KPIs Secundarios',
      description: 'Actividades, prórrogas, cerradas hoy e índice de cierre',
      defaultSize: { w: 12, h: 2 },
      roles: ['vicepresidente', 'administrador'],
      group: 'kpi',
    },
    render: (ctx) => {
      if (ctx.role !== 'vicepresidente' || !ctx.vp) return null
      const { metrics, cumplimiento } = ctx.vp
      return (
        <KpiOverviewSection primaryItems={[
          { title: 'Total Actividades', value: metrics?.total_actividades ?? 0, icon: ListChecks },
          { title: 'Con Prórroga', value: metrics?.con_prorroga ?? 0, icon: Calendar },
          { title: 'Cerradas Hoy', value: metrics?.cerradas_hoy ?? 0, icon: Zap, variant: 'success' },
          { title: 'Índice de Cierre', value: `${cumplimiento}%`, icon: Target, variant: cumplimiento >= 70 ? 'success' : 'danger' },
        ]} />
      )
    },
  },

  'chart-estado': {
    meta: {
      label: 'Gráfico Por Estado',
      description: 'Dona: distribución de hallazgos por estado',
      defaultSize: { w: 4, h: 3 },
      roles: ['vicepresidente', 'directivo', 'administrador'],
      group: 'chart',
    },
    render: (ctx) => {
      const data = (ctx.role === 'vicepresidente' ? ctx.vp?.porEstado : ctx.directivo?.porEstado) ?? []
      const total = (ctx.role === 'vicepresidente' ? ctx.vp?.total : ctx.directivo?.total) ?? 0
      const filled = data.map((d, i) => ({ ...d, fill: d.fill ?? CHART_COLORS_HEX[i % 5] }))
      return <DonutChartCard title="Por Estado" description="Estado actual de hallazgos" data={filled} centerLabel={String(total)} centerSubLabel="total" />
    },
  },

  'chart-estado-plan': {
    meta: {
      label: 'Estado del Plan de Acción',
      description: 'Dona: distribución por estado del plan',
      defaultSize: { w: 4, h: 3 },
      roles: ['vicepresidente', 'directivo', 'administrador'],
      group: 'chart',
    },
    render: (ctx) => {
      const data = (ctx.role === 'vicepresidente' ? ctx.vp?.porEstadoPlan : ctx.directivo?.porEstadoPlan) ?? []
      const total = (ctx.role === 'vicepresidente' ? ctx.vp?.total : ctx.directivo?.total) ?? 0
      const filled = data.map((d, i) => ({ ...d, fill: d.fill ?? CHART_COLORS_HEX[i % 5] }))
      return <DonutChartCard title="Estado del Plan" description="Distribución por estado del plan" data={filled} centerLabel={String(total)} centerSubLabel="total" />
    },
  },

  'chart-cierre': {
    meta: {
      label: 'Índice de Cierre',
      description: 'Gauge radial de cumplimiento',
      defaultSize: { w: 4, h: 3 },
      roles: ['vicepresidente', 'directivo', 'administrador'],
      group: 'chart',
    },
    render: (ctx) => {
      const cumplimiento = (ctx.role === 'vicepresidente' ? ctx.vp?.cumplimiento : ctx.directivo?.cumplimiento) ?? 0
      const cerradas = ctx.role === 'vicepresidente'
        ? (ctx.vp?.metrics?.cerradas ?? 0)
        : (ctx.directivo?.metricas?.cerradas ?? 0)
      const total = (ctx.role === 'vicepresidente' ? ctx.vp?.total : ctx.directivo?.total) ?? 0
      return <ClosureGaugeCard cumplimiento={cumplimiento} cerradas={cerradas} total={total} />
    },
  },

  'chart-evolucion': {
    meta: {
      label: 'Evolución Mensual',
      description: 'Área: hallazgos cerrados por mes (12 meses)',
      defaultSize: { w: 6, h: 3 },
      roles: ['vicepresidente', 'administrador'],
      group: 'chart',
    },
    render: (ctx) => {
      if (ctx.role !== 'vicepresidente') return null
      return <EvolucionWidget timeline={ctx.vp?.timeline ?? []} />
    },
  },

  'chart-por-responsable': {
    meta: {
      label: 'Por Responsable / Vicepresidencia',
      description: 'Barras: distribución por responsable o VP',
      defaultSize: { w: 6, h: 3 },
      roles: ['vicepresidente', 'administrador'],
      group: 'chart',
    },
    render: (ctx) => {
      if (ctx.role !== 'vicepresidente' || !ctx.vp) return null
      const data = ctx.vp.isVice ? ctx.vp.porDependencia : ctx.vp.porResponsable
      return <ResponsableBarWidget data={data} isVice={ctx.vp.isVice} />
    },
  },

  'top-responsables': {
    meta: {
      label: 'Top Responsables',
      description: 'Ranking de responsables con más hallazgos',
      defaultSize: { w: 4, h: 3 },
      roles: ['vicepresidente', 'administrador'],
      group: 'panel',
    },
    render: (ctx) => {
      if (ctx.role !== 'vicepresidente') return null
      return <TopResponsablesCard responsables={ctx.vp?.porResponsable ?? []} />
    },
  },

  'cargas-recientes': {
    meta: {
      label: 'Cargas Recientes',
      description: 'Últimos archivos cargados al sistema',
      defaultSize: { w: 8, h: 3 },
      roles: ['vicepresidente', 'administrador'],
      group: 'panel',
    },
    render: (ctx) => {
      if (ctx.role !== 'vicepresidente') return null
      return <CargasRecientesCard uploads={ctx.vp?.uploads ?? []} />
    },
  },

  'alertas-criticas': {
    meta: {
      label: 'Alertas Críticas',
      description: 'Hallazgos vencidos o próximos a vencer',
      defaultSize: { w: 12, h: 2 },
      roles: ['directivo'],
      group: 'panel',
    },
    render: (ctx) => {
      if (ctx.role !== 'directivo' || !ctx.directivo) return null
      return (
        <AlertasCriticasPanel
          hallazgos={ctx.directivo.hallazgos?.hallazgos ?? []}
          onAtendido={() => ctx.directivo!.reload(true)}
        />
      )
    },
  },

  'estado-acciones': {
    meta: {
      label: 'Estado de Acciones',
      description: 'Distribución del estado de acciones del directivo',
      defaultSize: { w: 4, h: 3 },
      roles: ['directivo'],
      group: 'chart',
    },
    render: (ctx) => {
      if (ctx.role !== 'directivo') return null
      return <EstadoAccionesCard data={ctx.directivo?.porEstadoAccion ?? []} />
    },
  },

  'directivo-hallazgos-table': {
    meta: {
      label: 'Tabla de Hallazgos',
      description: 'Vista completa de hallazgos asignados',
      defaultSize: { w: 12, h: 4 },
      roles: ['directivo'],
      group: 'table',
    },
    render: (ctx) => {
      if (ctx.role !== 'directivo' || !ctx.directivo) return null
      return (
        <DirectivoHallazgosTable
          hallazgos={ctx.directivo.hallazgos}
          page={ctx.directivo.hPage}
          onPageChange={ctx.directivo.setHPage}
        />
      )
    },
  },

  'tendencia-directivo': {
    meta: {
      label: 'Tendencia de Cierre',
      description: 'Evolución de cerrados/abiertos últimos 6 meses',
      defaultSize: { w: 4, h: 3 },
      roles: ['directivo'],
      group: 'chart',
    },
    render: (ctx) => {
      if (ctx.role !== 'directivo') return null
      return <TendenciaDirectivoWidget />
    },
  },

  'donut-estado-directivo': {
    meta: {
      label: 'Estado de Hallazgos',
      description: 'Dona de mis hallazgos por estado',
      defaultSize: { w: 4, h: 3 },
      roles: ['directivo'],
      group: 'chart',
    },
    render: (ctx) => {
      if (ctx.role !== 'directivo' || !ctx.directivo) return null
      const data = ctx.directivo.porEstado
      const total = ctx.directivo.total
      return <DonutChartCard title="Estado de Hallazgos" description="Distribución de mis hallazgos" data={data} centerLabel={String(total)} centerSubLabel="Total" />
    },
  },

  'donut-plan-directivo': {
    meta: {
      label: 'Estado del Plan',
      description: 'Dona del estado de mis planes de acción',
      defaultSize: { w: 4, h: 3 },
      roles: ['directivo'],
      group: 'chart',
    },
    render: (ctx) => {
      if (ctx.role !== 'directivo' || !ctx.directivo) return null
      const data = ctx.directivo.porEstadoPlan
      const count = data.reduce((a, d) => a + d.value, 0)
      return <DonutChartCard title="Estado del Plan" description="Estado de mis planes de acción" data={data} centerLabel={String(count)} centerSubLabel="Planes" />
    },
  },

  'bar-estado-vertical': {
    meta: {
      label: 'Barras por Estado',
      description: 'Barras verticales: distribución de hallazgos por estado',
      defaultSize: { w: 6, h: 3 },
      roles: ['vicepresidente', 'directivo', 'administrador'],
      group: 'chart',
    },
    render: (ctx) => {
      const data = (ctx.role === 'vicepresidente' ? ctx.vp?.porEstado : ctx.directivo?.porEstado) ?? []
      const filled = data.map((d, i) => ({ ...d, fill: d.fill ?? CHART_COLORS_HEX[i % 5] }))
      return <BarEstadoWidget data={filled} title="Hallazgos por Estado" />
    },
  },

  'bar-plan-vertical': {
    meta: {
      label: 'Barras por Plan de Acción',
      description: 'Barras verticales: distribución por estado del plan',
      defaultSize: { w: 6, h: 3 },
      roles: ['vicepresidente', 'directivo', 'administrador'],
      group: 'chart',
    },
    render: (ctx) => {
      const data = (ctx.role === 'vicepresidente' ? ctx.vp?.porEstadoPlan : ctx.directivo?.porEstadoPlan) ?? []
      const filled = data.map((d, i) => ({ ...d, fill: d.fill ?? CHART_COLORS_HEX[i % 5] }))
      return <BarEstadoWidget data={filled} title="Estado del Plan de Acción" />
    },
  },

  'bar-dependencia': {
    meta: {
      label: 'Barras por Dependencia',
      description: 'Barras horizontales: hallazgos por dependencia organizacional',
      defaultSize: { w: 6, h: 3 },
      roles: ['vicepresidente', 'administrador'],
      group: 'chart',
    },
    render: (ctx) => {
      if (ctx.role !== 'vicepresidente' || !ctx.vp) return null
      return <BarDependenciaWidget data={ctx.vp.porDependencia} />
    },
  },

  'line-evolucion': {
    meta: {
      label: 'Línea de Evolución Mensual',
      description: 'Línea: tendencia de hallazgos cerrados en 12 meses',
      defaultSize: { w: 6, h: 3 },
      roles: ['vicepresidente', 'administrador'],
      group: 'chart',
    },
    render: (ctx) => {
      if (ctx.role !== 'vicepresidente' || !ctx.vp) return null
      return <LineEvolucionWidget timeline={ctx.vp.timeline} />
    },
  },

  'kpi-vencidos': {
    meta: {
      label: 'Resumen de Vencimientos',
      description: 'Tarjeta: vencidos, prorrogas, abiertas y cerradas',
      defaultSize: { w: 4, h: 3 },
      roles: ['vicepresidente', 'directivo', 'administrador'],
      group: 'kpi',
    },
    render: (ctx) => {
      if (ctx.role === 'vicepresidente' && ctx.vp) {
        const { metrics } = ctx.vp
        return <KpiVencidosWidget vencidos={metrics?.vencidos ?? 0} prorroga={metrics?.con_prorroga ?? 0} abiertas={metrics?.abiertas ?? 0} cerradas={metrics?.cerradas ?? 0} />
      }
      if (ctx.role === 'directivo' && ctx.directivo) {
        const { metricas } = ctx.directivo
        return <KpiVencidosWidget vencidos={metricas?.vencidos ?? 0} prorroga={metricas?.con_prorroga ?? 0} abiertas={metricas?.abiertas ?? 0} cerradas={metricas?.cerradas ?? 0} />
      }
      return null
    },
  },

  'bar-accion-directivo': {
    meta: {
      label: 'Barras de Acciones',
      description: 'Barras verticales: mis acciones por estado',
      defaultSize: { w: 4, h: 3 },
      roles: ['directivo'],
      group: 'chart',
    },
    render: (ctx) => {
      if (ctx.role !== 'directivo' || !ctx.directivo) return null
      return <BarAccionDirectivoWidget data={ctx.directivo.porEstadoAccion} />
    },
  },
}

// ─── Default layouts ───────────────────────────────────────────────────────────

export const VP_DEFAULT_LAYOUT: DashboardBlock[] = [
  { id: 'vp-b1', widgetType: 'kpi-row-primary',      x: 0, y: 0,  w: 12, h: 2 },
  { id: 'vp-b2', widgetType: 'kpi-row-secondary',    x: 0, y: 2,  w: 12, h: 2 },
  { id: 'vp-b3', widgetType: 'chart-estado',         x: 0, y: 4,  w: 4,  h: 3 },
  { id: 'vp-b4', widgetType: 'chart-estado-plan',    x: 4, y: 4,  w: 4,  h: 3 },
  { id: 'vp-b5', widgetType: 'chart-cierre',         x: 8, y: 4,  w: 4,  h: 3 },
  { id: 'vp-b6', widgetType: 'chart-evolucion',      x: 0, y: 7,  w: 6,  h: 3 },
  { id: 'vp-b7', widgetType: 'chart-por-responsable',x: 6, y: 7,  w: 6,  h: 3 },
  { id: 'vp-b8', widgetType: 'top-responsables',     x: 0, y: 10, w: 4,  h: 3 },
  { id: 'vp-b9', widgetType: 'cargas-recientes',     x: 4, y: 10, w: 8,  h: 3 },
]

export const DIRECTIVO_DEFAULT_LAYOUT: DashboardBlock[] = [
  { id: 'd-b1', widgetType: 'kpi-row-primary',           x: 0, y: 0,  w: 12, h: 2 },
  { id: 'd-b2', widgetType: 'alertas-criticas',          x: 0, y: 2,  w: 12, h: 2 },
  { id: 'd-b3', widgetType: 'donut-estado-directivo',    x: 0, y: 4,  w: 4,  h: 3 },
  { id: 'd-b4', widgetType: 'donut-plan-directivo',      x: 4, y: 4,  w: 4,  h: 3 },
  { id: 'd-b5', widgetType: 'tendencia-directivo',       x: 8, y: 4,  w: 4,  h: 3 },
  { id: 'd-b6', widgetType: 'chart-cierre',              x: 0, y: 7,  w: 4,  h: 3 },
  { id: 'd-b7', widgetType: 'estado-acciones',           x: 4, y: 7,  w: 4,  h: 3 },
  { id: 'd-b8', widgetType: 'directivo-hallazgos-table', x: 0, y: 10, w: 12, h: 4 },
]
