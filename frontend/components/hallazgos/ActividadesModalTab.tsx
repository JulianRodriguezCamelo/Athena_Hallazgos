'use client'

import { useEffect, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { hallazgosApi } from '@/lib/api'
import { StatusBadge } from './StatusBadge'
import { DetailField } from './DetailField'

interface Actividad {
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

export function ActividadesModalTab({ hallazgoId }: { hallazgoId: number }) {
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
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">{act.descripcion ?? '—'}</p>
            </div>
            {act.estado_plan_accion && <StatusBadge value={act.estado_plan_accion} />}
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
              <p className="text-sm text-foreground bg-muted/40 rounded-lg p-3 leading-relaxed">{act.observaciones}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
