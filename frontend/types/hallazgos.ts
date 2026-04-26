// ─── Hallazgo types ──────────────────────────────────────────────────────────

export interface Hallazgo {
  id: number
  codigo_del_hallazgo: string | null
  descripcion: string | null
  fecha_inicial_evento: string | null
  fecha_cierre_proyectada: string | null
  dependencia_reporta_ero: string | null
  vicepresidencia: string | null
  direccion: string | null
  estado: string | null
  reportado_por: string | null
  prorroga: string | null
  observaciones: string | null
  aplicativo_afecta_ero: string | null
  fecha_finalizacion_evento: string | null
  reportado_para: string | null
  fecha_cierre_final_prorroga: string | null
  vinculado_via_actividad?: boolean
}

export type WorkflowEstado = 'abierto' | 'en_analisis' | 'en_ejecucion' | 'en_validacion' | 'cerrado'

export type Prioridad = 'alta' | 'media' | 'baja'

// Row type used in lists/tables (from API paginated responses)
export interface HallazgoRow {
  id: number
  codigo_del_hallazgo: string | null
  descripcion: string | null
  estado: string | null
  estado_plan_accion: string | null
  responsable_plan_accion: string | null
  responsable_accion: string | null
  fecha_cierre_proyectada: string | null
  dependencia_reporta_ero: string | null
  prorroga: string | null
  prioridad: Prioridad
  dias_restantes: number
  sla_dias: number
  workflow_estado: WorkflowEstado
}

export interface Actividad {
  id: number
  hallazgo_id: number | null
  codigo_del_hallazgo: string | null
  orden: number | null
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

export interface ActividadRow {
  id: number
  hallazgo_id?: number
  codigo_del_hallazgo: string
  descripcion: string | null
  estado_plan_accion: string | null
  responsable: string | null
  estado_accion: string | null
  responsable_accion: string | null
  fecha_compromiso: string | null
}

export interface Meta {
  total: number
  pages: number
  page: number
}

export interface PagedHallazgos {
  hallazgos: HallazgoRow[]
  total: number
  page: number
  pages: number
}

export interface PagedActividades {
  actividades: ActividadRow[]
  total: number
  page: number
  pages: number
}

export interface HallazgoWithActividades {
  id: number
  codigo: string
  descripcion: string
  estado: string
  prioridad: Prioridad
  dias_restantes: number
  workflow_estado: WorkflowEstado
  actividades: ActividadRow[]
  completadas: number
  total: number
}

export interface BitacoraEntry {
  id: number
  fecha: string
  usuario: string
  accion: string
  detalle: string
}

export interface ResponsableCritico {
  nombre: string
  hallazgos_vencidos: number
  hallazgos_activos: number
  cumplimiento: number
}

export interface RetrasadoRow {
  codigo: string
  descripcion: string
  dias_retraso: number
  responsable: string
  estado: string
}

export interface AnalysisResult {
  total: number
  total_actividades: number
  vencidos: number
  con_prorroga: number
  por_estado: { estado: string; total: number }[]
  por_dependencia: { nombre: string; total: number }[]
  por_responsable: { nombre: string; total: number }[]
  errores: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const WORKFLOW_STEPS: { estado: WorkflowEstado; label: string }[] = [
  { estado: 'abierto',       label: 'Abierto' },
  { estado: 'en_analisis',   label: 'En Análisis' },
  { estado: 'en_ejecucion',  label: 'En Ejecución' },
  { estado: 'en_validacion', label: 'En Validación' },
  { estado: 'cerrado',       label: 'Cerrado' },
]

export const PRIORIDAD_CONFIG: Record<Prioridad, { color: string; label: string }> = {
  alta:  { color: 'bg-red-500/10 text-red-600 border-red-500/20',    label: 'Alta' },
  media: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Media' },
  baja:  { color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Baja' },
}
