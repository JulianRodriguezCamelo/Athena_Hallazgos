'use client'

import { useState } from 'react'
import { Users, AlertTriangle, Bell, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { gestorApi } from '@/lib/api'
import { ModalNotificacionPersonalizada } from '@/components/organisms/modals/ModalNotificacionPersonalizada'
import type { ResponsableCritico } from '@/types'

interface Props {
  responsables: ResponsableCritico[]
}

export function ResponsablesCriticosCard({ responsables }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalDefaults, setModalDefaults] = useState<{
    nombre: string; correo: string; hallazgo: string
  }>({ nombre: '', correo: '', hallazgo: '' })

  async function handleEnviarRecordatorios() {
    setEnviando(true)
    setFeedback(null)
    try {
      await gestorApi.enviarRecordatorios()
      setFeedback({ ok: true, msg: 'Recordatorios enviados correctamente' })
    } catch {
      setFeedback({ ok: false, msg: 'Error al enviar recordatorios' })
    } finally {
      setEnviando(false)
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  function openModalFor(resp?: ResponsableCritico) {
    setModalDefaults({
      nombre: resp?.nombre ?? '',
      correo: '',
      hallazgo: '',
    })
    setModalOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Responsables Críticos</CardTitle>
              <CardDescription className="text-xs">Requieren seguimiento inmediato</CardDescription>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {responsables.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {responsables.map((resp, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{resp.nombre}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {resp.hallazgos_vencidos}v · {resp.hallazgos_activos}a
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <div className="text-right">
                      <p className={cn('text-base font-bold',
                        resp.cumplimiento >= 70 ? 'text-green-500' : resp.cumplimiento >= 40 ? 'text-amber-500' : 'text-destructive',
                      )}>
                        {resp.cumplimiento}%
                      </p>
                      <p className="text-[9px] text-muted-foreground">cumplim.</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      title="Enviar notificación personalizada"
                      onClick={() => openModalFor(resp)}
                    >
                      <Send className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {feedback && (
            <p className={cn('text-xs mt-2 text-center', feedback.ok ? 'text-green-500' : 'text-destructive')}>
              {feedback.msg}
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleEnviarRecordatorios}
              disabled={enviando}
            >
              <Bell className="h-3.5 w-3.5" />
              {enviando ? 'Enviando…' : 'Recordatorios'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => openModalFor()}
            >
              <Send className="h-3.5 w-3.5" />
              Personalizada
            </Button>
          </div>
        </CardContent>
      </Card>

      <ModalNotificacionPersonalizada
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultNombre={modalDefaults.nombre}
        defaultCorreo={modalDefaults.correo}
        defaultHallazgo={modalDefaults.hallazgo}
      />
    </>
  )
}
