'use client'

import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { notificacionesApi } from '@/lib/api'

interface Props {
  open: boolean
  onClose: () => void
  defaultNombre?: string
  defaultCorreo?: string
  defaultDireccion?: string
  defaultHallazgo?: string
}

export function ModalNotificacionPersonalizada({
  open, onClose,
  defaultNombre = '',
  defaultCorreo = '',
  defaultDireccion = '',
  defaultHallazgo = '',
}: Props) {
  const [nombre, setNombre] = useState(defaultNombre)
  const [correo, setCorreo] = useState(defaultCorreo)
  const [direccion, setDireccion] = useState(defaultDireccion)
  const [hallazgo, setHallazgo] = useState(defaultHallazgo)
  const [estadoNotas, setEstadoNotas] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      setNombre(defaultNombre)
      setCorreo(defaultCorreo)
      setDireccion(defaultDireccion)
      setHallazgo(defaultHallazgo)
      setEstadoNotas('')
      setError('')
      setSuccess(false)
    }
  }, [open, defaultNombre, defaultCorreo, defaultDireccion, defaultHallazgo])

  async function handleSend() {
    if (!nombre.trim() || !correo.trim()) {
      setError('Nombre y correo son obligatorios.')
      return
    }
    setSending(true)
    setError('')
    try {
      await notificacionesApi.enviarPersonalizada({ nombre, correo, direccion, hallazgo, estado_notas: estadoNotas })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 1800)
    } catch {
      setError('Error al enviar la notificación. Verifica el correo e intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Enviar notificación personalizada
          </DialogTitle>
          <DialogDescription className="text-xs">
            Envía un correo con el detalle del hallazgo a cualquier destinatario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Nombre completo"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Correo electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Dirección / Área
            </Label>
            <Input
              placeholder="Ej: Dirección de Tecnología"
              value={direccion}
              onChange={e => setDireccion(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hallazgo
            </Label>
            <Input
              placeholder="Código o descripción del hallazgo"
              value={hallazgo}
              onChange={e => setHallazgo(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Estado / Notas
            </Label>
            <Textarea
              placeholder="Escribe el mensaje, estado actual o notas relevantes para el destinatario…"
              className="resize-none text-sm"
              rows={4}
              value={estadoNotas}
              onChange={e => setEstadoNotas(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-green-500">Notificación enviada correctamente.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!nombre.trim() || !correo.trim() || sending}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {sending ? 'Enviando…' : 'Enviar notificación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
