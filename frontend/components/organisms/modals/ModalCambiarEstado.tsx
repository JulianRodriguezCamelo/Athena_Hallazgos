'use client'

import { useState, useEffect } from 'react'
import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import Select from '@/components/ui/Select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { hallazgosApi } from '@/lib/api'
import type { HallazgoRow } from '@/types'

const ESTADOS_HALLAZGO = [
  'Abierta', 'En Proceso', 'En Revisión', 'Pendiente de Validación', 'Cerrada', 'Vencida',
]

interface Props {
  h: HallazgoRow | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function ModalCambiarEstado({ h, open, onClose, onSaved }: Props) {
  const [estado, setEstado] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (h) setEstado(h.estado ?? '') }, [h])

  async function handleSave() {
    if (!h || !estado) return
    setSaving(true)
    setError('')
    try {
      await hallazgosApi.update(h.id, { estado })
      onSaved()
      onClose()
    } catch {
      setError('Error al cambiar el estado. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (!h) return null
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Cambiar estado — {h.codigo_del_hallazgo ?? `#${h.id}`}
          </DialogTitle>
          <DialogDescription className="text-xs line-clamp-2">{h.descripcion}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado actual</Label>
            <p className="text-sm">{h.estado ?? '—'}</p>
          </div>
          <Select
            label="Nuevo estado"
            value={estado}
            options={ESTADOS_HALLAZGO.map(e => ({ value: e, label: e }))}
            onChange={e => setEstado(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={!estado || saving}>{saving ? 'Guardando…' : 'Confirmar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
