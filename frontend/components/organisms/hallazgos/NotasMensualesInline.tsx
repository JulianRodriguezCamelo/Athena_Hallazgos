'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Send, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { actividadesApi } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import type { NotaSeguimiento } from '@/types'

interface Props {
  actividadId: number
  sinNotaMensual?: boolean
  ultimaNotaAt?: string | null
  defaultExpanded?: boolean
}

export function NotasMensualesInline({ actividadId, sinNotaMensual: initialSinNota, defaultExpanded }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)
  const [notas, setNotas] = useState<NotaSeguimiento[]>([])
  const [nuevaNota, setNuevaNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [sinNotaMensual, setSinNotaMensual] = useState(initialSinNota ?? false)

  useEffect(() => {
    if (!expanded || loaded) return
    actividadesApi.listNotas(actividadId)
      .then((res) => {
        const d = res.data as { notas: NotaSeguimiento[] }
        setNotas(d.notas ?? [])
        setLoaded(true)
      })
      .catch(() => { setLoaded(true) })
  }, [expanded, loaded, actividadId])

  async function handleSend() {
    if (!nuevaNota.trim()) return
    setEnviando(true)
    try {
      const res = await actividadesApi.addNota(actividadId, nuevaNota.trim()) as { data: { nota: NotaSeguimiento } }
      setNotas([res.data.nota, ...notas])
      setNuevaNota('')
      setSinNotaMensual(false)
    } catch {}
    finally { setEnviando(false) }
  }

  return (
    <div className="border-t border-border/50 mt-2 pt-2">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-2 text-xs transition-colors w-full text-left',
          sinNotaMensual && !expanded
            ? 'text-amber-600 hover:text-amber-700'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {sinNotaMensual ? (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
        )}
        <span className="flex-1">
          {sinNotaMensual
            ? 'Pendiente nota/evidencia mensual — haz clic para registrar'
            : `Notas de seguimiento${loaded && notas.length > 0 ? ` (${notas.length})` : ''}`}
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {sinNotaMensual && (
            <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Regla mensual: se requiere al menos una nota o evidencia por mes para esta actividad.</span>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <textarea
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Escribe una nota de avance o evidencia... (Ctrl+Enter para enviar)"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!nuevaNota.trim() || enviando}
              className="self-end"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Notes list */}
          {!loaded ? (
            <p className="text-xs text-muted-foreground text-center py-3">Cargando notas...</p>
          ) : notas.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">
              Sin notas de seguimiento registradas
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {notas.map((n) => (
                <div key={n.id} className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2">
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{n.nota}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {n.autor} · {formatDateTime(n.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
