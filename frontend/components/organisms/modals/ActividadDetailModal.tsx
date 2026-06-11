'use client'

import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, Send, MessageSquare } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import { DetailField } from '@/components/atoms/DetailField'
import { Button } from '@/components/ui/button'
import { actividadesApi } from '@/lib/api'
import { ChecklistSection } from '@/components/organisms/hallazgos/ChecklistSection'
import type { Actividad, NotaSeguimiento } from '@/types'

interface Props {
  actividad: Actividad | null
  onClose: () => void
  readOnly?: boolean
}

export function ActividadDetailModal({ actividad, onClose, readOnly = false }: Props) {
  const [notas, setNotas] = useState<NotaSeguimiento[]>([])
  const [nuevaNota, setNuevaNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [loadingNotas, setLoadingNotas] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!actividad) return
    setNotas([])
    setNuevaNota('')
    setLoadingNotas(true)
    actividadesApi.listNotas(actividad.id)
      .then((res) => setNotas((res.data as { notas: NotaSeguimiento[] }).notas ?? []))
      .catch(() => {})
      .finally(() => setLoadingNotas(false))
  }, [actividad?.id])

  if (!actividad) return null

  async function handleAddNota() {
    if (!nuevaNota.trim() || !actividad) return
    setEnviando(true)
    try {
      const res = await actividadesApi.addNota(actividad.id, nuevaNota.trim()) as { data: { nota: NotaSeguimiento } }
      setNotas([res.data.nota, ...notas])
      setNuevaNota('')
      actividad.ultima_nota_at = res.data.nota.created_at
      actividad.sin_nota_mensual = false
    } catch {
      // error silencioso — podría mostrarse un toast
    } finally {
      setEnviando(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleAddNota()
    }
  }

  return (
    <Modal open={!!actividad} onClose={onClose} title="Actividad" size="lg">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">

        {/* Alerta nota mensual */}
        {actividad.sin_nota_mensual && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-600 leading-relaxed">
              {actividad.ultima_nota_at
                ? `Última nota hace más de 30 días (${formatDate(actividad.ultima_nota_at)}). Se requiere al menos una nota mensual.`
                : 'Esta actividad no tiene notas de seguimiento. Se requiere al menos una nota mensual.'}
            </p>
          </div>
        )}

        {/* Campos */}
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

        {/* Checklist de evidencias */}
        <div>
          <ChecklistSection
            actividadId={actividad.id}
            onProgresoChange={(completados, total) => {
              actividad.progreso_checklist = { completados, total }
            }}
          />
        </div>

        {/* Notas de seguimiento */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Notas de seguimiento
            </p>
            {notas.length > 0 && (
              <span className="text-xs text-muted-foreground">({notas.length})</span>
            )}
            {readOnly && (
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto">
                Solo lectura
              </span>
            )}
          </div>

          {/* Formulario nueva nota — oculto en modo lectura */}
          {!readOnly && (
            <div className="flex gap-2 mb-4">
              <textarea
                ref={textareaRef}
                value={nuevaNota}
                onChange={(e) => setNuevaNota(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe una nota de avance... (Ctrl+Enter para enviar)"
                rows={2}
                className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                size="sm"
                onClick={handleAddNota}
                disabled={!nuevaNota.trim() || enviando}
                className="self-end"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Lista de notas */}
          {loadingNotas ? (
            <p className="text-xs text-muted-foreground text-center py-4">Cargando notas...</p>
          ) : notas.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
              Sin notas de seguimiento
            </p>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {notas.map((n) => (
                <div key={n.id} className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{n.nota}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {n.autor} · {formatDateTime(n.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Modal>
  )
}
