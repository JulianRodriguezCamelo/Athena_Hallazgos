'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { hallazgosApi } from '@/lib/api'
import type { HallazgoRow } from '@/types'

interface Props {
  h: HallazgoRow | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function ModalSolicitarProrroga({ h, open, onClose, onSaved }: Props) {
  const [fecha, setFecha] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) { setFecha(''); setJustificacion(''); setError('') }
  }, [open])

  async function handleSave() {
    if (!h || !fecha) return
    setSaving(true)
    setError('')
    try {
      const prorroga = justificacion ? `${fecha} — ${justificacion}` : fecha
      await hallazgosApi.update(h.id, { prorroga, fecha_cierre_proyectada: fecha })
      onSaved()
      onClose()
    } catch {
      setError('Error al registrar la prórroga. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  if (!h) return null
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Solicitar prórroga — {h.codigo_del_hallazgo ?? `#${h.id}`}
          </DialogTitle>
          <DialogDescription className="text-xs">Establece una nueva fecha de cierre y una justificación.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nueva fecha de cierre</Label>
            <Input type="date" value={fecha} min={new Date().toISOString().slice(0, 10)} onChange={e => setFecha(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Justificación</Label>
            <Textarea
              placeholder="Describe el motivo de la prórroga…"
              className="resize-none text-sm"
              rows={3}
              value={justificacion}
              onChange={e => setJustificacion(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={!fecha || saving}>{saving ? 'Guardando…' : 'Registrar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
