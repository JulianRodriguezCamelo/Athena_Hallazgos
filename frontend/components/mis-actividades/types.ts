export interface ActividadItem {
  id: number
  descripcion: string | null
  estado_accion: string | null
  responsable_accion: string | null
  fecha_compromiso: string | null
  orden: number
}

export interface HallazgoChecklist {
  id: number
  codigo_del_hallazgo: string
  descripcion: string
  estado: string
  dependencia_reporta_ero: string | null
  vicepresidencia: string | null
  fecha_cierre_proyectada: string | null
  dias_restantes: number | null
  total_actividades: number
  actividades_completadas: number
  progreso: number
  actividades: ActividadItem[]
}

export interface ChecklistResponse {
  hallazgos: HallazgoChecklist[]
  total: number
  pages: number
  page: number
}

export function isCompletada(estado: string | null): boolean {
  if (!estado) return false
  const lower = estado.toLowerCase()
  return lower.includes('cerrado') || lower.includes('completado') || lower.includes('cumplido')
}

export function diasLabel(dias: number | null) {
  if (dias === null) return { text: 'Sin fecha', color: 'text-muted-foreground', bg: 'bg-muted/40' }
  if (dias < 0) return { text: `Vencido hace ${Math.abs(dias)} días`, color: 'text-destructive', bg: 'bg-destructive/10' }
  if (dias === 0) return { text: 'Vence hoy', color: 'text-amber-600', bg: 'bg-amber-500/10' }
  if (dias <= 7) return { text: `${dias} días restantes`, color: 'text-amber-600', bg: 'bg-amber-500/10' }
  if (dias <= 30) return { text: `${dias} días restantes`, color: 'text-blue-600', bg: 'bg-blue-500/10' }
  return { text: `${dias} días restantes`, color: 'text-green-600', bg: 'bg-green-500/10' }
}
