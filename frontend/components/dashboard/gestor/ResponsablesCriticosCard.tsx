'use client'

import { useState } from 'react'
import { AlertTriangle, Users, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { gestorApi } from '@/lib/api'
import type { ResponsableCritico } from './types'

export function ResponsablesCriticosCard({ responsables }: { responsables: ResponsableCritico[] }) {
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

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

  return (
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
                    <p className="text-[10px] text-muted-foreground">{resp.hallazgos_vencidos}v · {resp.hallazgos_activos}a</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className={cn('text-base font-bold',
                    resp.cumplimiento >= 70 ? 'text-green-500' : resp.cumplimiento >= 40 ? 'text-amber-500' : 'text-destructive',
                  )}>{resp.cumplimiento}%</p>
                  <p className="text-[9px] text-muted-foreground">cumplim.</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {feedback && (
          <p className={cn('text-xs mt-2 text-center', feedback.ok ? 'text-green-500' : 'text-destructive')}>{feedback.msg}</p>
        )}
        <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5" onClick={handleEnviarRecordatorios} disabled={enviando}>
          <Bell className="h-3.5 w-3.5" />
          {enviando ? 'Enviando…' : 'Enviar recordatorios'}
        </Button>
      </CardContent>
    </Card>
  )
}
