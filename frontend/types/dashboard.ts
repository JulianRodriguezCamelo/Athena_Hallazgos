// ─── Dashboard types ──────────────────────────────────────────────────────────

export interface ChartItem {
  name: string
  value: number
  fill?: string
}

export interface TimelineItem {
  name: string
  value: number
}

// VP dashboard metrics
export interface Metrics {
  total_hallazgos: number
  total_actividades: number
  abiertas: number
  cerradas: number
  cerradas_hoy: number
  con_prorroga: number
  vencidos: number
}

// Directivo dashboard metrics
export interface MetricasDirectivo {
  total: number
  abiertas: number
  cerradas: number
  vencidos: number
  con_prorroga: number
  mis_actividades: number
}

// Gestor dashboard metrics
export interface MetricasGestor {
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

export interface UploadItem {
  filename_original: string
  uploaded_at: string
  total_registros: number
}

export const CHART_COLORS_HEX = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

// ─── Customizable Dashboard ───────────────────────────────────────────────────

export type WidgetType =
  | 'kpi-row-primary'
  | 'kpi-row-secondary'
  | 'chart-estado'
  | 'chart-estado-plan'
  | 'chart-cierre'
  | 'chart-evolucion'
  | 'chart-por-responsable'
  | 'top-responsables'
  | 'cargas-recientes'
  | 'alertas-criticas'
  | 'estado-acciones'
  | 'directivo-hallazgos-table'
  | 'tendencia-directivo'
  | 'donut-estado-directivo'
  | 'donut-plan-directivo'
  | 'bar-estado-vertical'
  | 'bar-plan-vertical'
  | 'bar-dependencia'
  | 'line-evolucion'
  | 'kpi-vencidos'
  | 'bar-accion-directivo'

export interface DashboardBlock {
  id: string
  widgetType: WidgetType
  x: number
  y: number
  w: number
  h: number
}
