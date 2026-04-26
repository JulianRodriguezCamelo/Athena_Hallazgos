export interface HallazgoRow {
  id: number
  codigo_del_hallazgo: string | null
  descripcion: string | null
  estado: string | null
  estado_plan_accion: string | null
  responsable_plan_accion: string | null
  fecha_cierre_proyectada: string | null
  prorroga: string | null
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
  actividades: ActividadRow[]
  completadas: number
  total: number
}
