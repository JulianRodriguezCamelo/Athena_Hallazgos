'use client'

import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import type { HallazgoRow } from './types'

function fmtDate(dateString: string | null) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  h: HallazgoRow | null
  open: boolean
  onClose: () => void
}

export function ModalVerDetalle({ h, open, onClose }: Props) {
  if (!h) return null

  const rows: [string, string | null][] = [
    ['Código', h.codigo_del_hallazgo],
    ['Estado', h.estado],
    ['Estado plan', h.estado_plan_accion],
    ['Prioridad', h.prioridad],
    ['Responsable plan', h.responsable_plan_accion],
    ['Responsable acción', h.responsable_accion],
    ['Dependencia', h.dependencia_reporta_ero],
    ['Cierre proyectado', h.fecha_cierre_proyectada ? fmtDate(h.fecha_cierre_proyectada) : null],
    ['Prórroga', h.prorroga],
    ['Días restantes', String(h.dias_restantes)],
  ]

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Detalle — {h.codigo_del_hallazgo ?? `#${h.id}`}
          </DialogTitle>
          <DialogDescription className="text-xs line-clamp-2">{h.descripcion}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-2">
          {rows.map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-sm mt-0.5">{val ?? '—'}</p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
