import { formatDate } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import { DetailField } from '@/components/atoms/DetailField'
import type { Actividad } from '@/types'

interface Props {
  actividad: Actividad | null
  onClose: () => void
}

export function ActividadDetailModal({ actividad, onClose }: Props) {
  if (!actividad) return null

  return (
    <Modal open={!!actividad} onClose={onClose} title="Actividad" size="lg">
      <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <DetailField label="Hallazgo" value={actividad.codigo_del_hallazgo} />
          <DetailField label="Estado Plan" value={actividad.estado_plan_accion} />
          <DetailField label="Responsable" value={actividad.responsable} />
          <DetailField label="Estado Acción" value={actividad.estado_accion} />
          <DetailField label="Responsable Acción" value={actividad.responsable_accion} />
          <DetailField label="Fecha Compromiso" value={formatDate(actividad.fecha_compromiso)} />
          <DetailField label="Prórroga" value={actividad.prorroga} />
          <DetailField label="Fecha Prórroga" value={formatDate(actividad.fecha_prorroga)} />
        </div>
        {actividad.descripcion && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Descripción</p>
            <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">{actividad.descripcion}</p>
          </div>
        )}
        {actividad.observaciones && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Observaciones</p>
            <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">{actividad.observaciones}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
