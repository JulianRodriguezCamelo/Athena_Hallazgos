import type { LucideIcon } from 'lucide-react'
import { Circle, Search, Play, Shield, CheckCircle2 } from 'lucide-react'

export interface HallazgoRow {
  id: number
  codigo_del_hallazgo: string | null
  descripcion: string | null
  estado: string
  estado_plan_accion: string | null
  responsable_plan_accion: string | null
  responsable_accion: string | null
  fecha_cierre_proyectada: string | null
  dependencia_reporta_ero: string | null
  prorroga: string | null
  prioridad: 'alta' | 'media' | 'baja'
  dias_restantes: number
  sla_dias: number
  workflow_estado: WorkflowEstado
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
  actividades_pendientes: number
}

export type WorkflowEstado = 'abierto' | 'en_analisis' | 'en_ejecucion' | 'en_validacion' | 'cerrado'

export interface HallazgoWithActividades {
  id: number
  codigo: string
  descripcion: string
  estado: string
  prioridad: 'alta' | 'media' | 'baja'
  dias_restantes: number
  workflow_estado: WorkflowEstado
  actividades: ActividadRow[]
  completadas: number
  total: number
}

export const WORKFLOW_STEPS: { estado: WorkflowEstado; label: string; icon: LucideIcon }[] = [
  { estado: 'abierto',       label: 'Abierto',       icon: Circle },
  { estado: 'en_analisis',   label: 'En Análisis',   icon: Search },
  { estado: 'en_ejecucion',  label: 'En Ejecución',  icon: Play },
  { estado: 'en_validacion', label: 'En Validación', icon: Shield },
  { estado: 'cerrado',       label: 'Cerrado',        icon: CheckCircle2 },
]

export const PRIORIDAD_CONFIG = {
  alta:  { color: 'bg-red-500/10 text-red-600 border-red-500/20',       label: 'Alta' },
  media: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', label: 'Media' },
  baja:  { color: 'bg-green-500/10 text-green-600 border-green-500/20', label: 'Baja' },
}

export const ESTADOS_HALLAZGO = [
  'Abierta', 'En Proceso', 'En Revisión', 'Pendiente de Validación', 'Cerrada', 'Vencida',
]
