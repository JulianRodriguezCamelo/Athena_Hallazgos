'use client'

import { useState, useEffect } from 'react'
import { Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { hallazgosApi } from '@/lib/api'
import type { HallazgoRow } from '@/types'

interface Props {
  h: HallazgoRow | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function ModalEditarPlan({ h, open, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    responsable_plan_accion: '',
    responsable_accion: '',
    estado_plan_accion: '',
    fecha_cierre_proyectada: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (h) setForm({
      responsable_plan_accion: h.responsable_plan_accion ?? '',
      responsable_accion: h.responsable_accion ?? '',
      estado_plan_accion: h.estado_plan_accion ?? '',
      fecha_cierre_proyectada: h.fecha_cierre_proyectada ? h.fecha_cierre_proyectada.slice(0, 10) : '',
    })
  }, [h])

  async function handleSave() {
    if (!h) return
    setSaving(true)
    setError('')
    try {
      await hallazgosApi.update(h.id, form)
      onSaved()
      onClose()
    } catch {
      setError('Error al guardar. Intenta de nuevo.')
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
            <Edit3 className="h-4 w-4" />
            Editar plan — {h.codigo_del_hallazgo ?? `#${h.id}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responsable plan de acción</Label>
            <Input value={form.responsable_plan_accion} onChange={e => setForm(f => ({ ...f, responsable_plan_accion: e.target.value }))} placeholder="Nombre del responsable" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responsable de acción</Label>
            <Input value={form.responsable_accion} onChange={e => setForm(f => ({ ...f, responsable_accion: e.target.value }))} placeholder="Nombre del responsable" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado plan</Label>
            <Input value={form.estado_plan_accion} onChange={e => setForm(f => ({ ...f, estado_plan_accion: e.target.value }))} placeholder="Estado del plan de acción" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha cierre proyectada</Label>
            <Input type="date" value={form.fecha_cierre_proyectada} onChange={e => setForm(f => ({ ...f, fecha_cierre_proyectada: e.target.value }))} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
