'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, Square, Plus, Trash2, ExternalLink, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { actividadesApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import type { ChecklistItem } from '@/types'

interface Props {
  actividadId: number
  onProgresoChange?: (completados: number, total: number) => void
}

export function ChecklistSection({ actividadId, onProgresoChange }: Props) {
  const { isVice } = useAuth()
  const canEdit = !isVice

  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevaDesc, setNuevaDesc] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [showForm, setShowForm] = useState(false)
  // itemId → link en edición
  const [linkEnEdicion, setLinkEnEdicion] = useState<Record<number, string>>({})
  const [completando, setCompletando] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    actividadesApi.listChecklist(actividadId)
      .then((res: { data: { items: ChecklistItem[] } }) => {
        const data = res.data.items ?? []
        setItems(data)
        notifyProgreso(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actividadId])

  function notifyProgreso(data: ChecklistItem[]) {
    if (!onProgresoChange) return
    const total = data.length
    const completados = data.filter(i => i.completado).length
    onProgresoChange(completados, total)
  }

  async function handleAdd() {
    if (!nuevaDesc.trim()) return
    setAgregando(true)
    try {
      const res = await actividadesApi.createChecklistItem(actividadId, nuevaDesc.trim()) as { data: { item: ChecklistItem } }
      const next = [...items, res.data.item]
      setItems(next)
      notifyProgreso(next)
      setNuevaDesc('')
      setShowForm(false)
    } catch {
      // silencioso
    } finally {
      setAgregando(false)
    }
  }

  async function handleComplete(item: ChecklistItem) {
    const link = linkEnEdicion[item.id] ?? ''
    setCompletando(item.id)
    try {
      const res = await actividadesApi.completeChecklistItem(item.id, link || undefined) as { data: { item: ChecklistItem } }
      const next = items.map(i => i.id === item.id ? res.data.item : i)
      setItems(next)
      notifyProgreso(next)
      setLinkEnEdicion(prev => { const c = { ...prev }; delete c[item.id]; return c })
    } catch {
      // silencioso
    } finally {
      setCompletando(null)
    }
  }

  async function handleReopen(itemId: number) {
    setCompletando(itemId)
    try {
      const res = await actividadesApi.reopenChecklistItem(itemId) as { data: { item: ChecklistItem } }
      const next = items.map(i => i.id === itemId ? res.data.item : i)
      setItems(next)
      notifyProgreso(next)
    } catch {
      // silencioso
    } finally {
      setCompletando(null)
    }
  }

  async function handleDelete(itemId: number) {
    try {
      await actividadesApi.deleteChecklistItem(itemId)
      const next = items.filter(i => i.id !== itemId)
      setItems(next)
      notifyProgreso(next)
    } catch {
      // silencioso
    }
  }

  const total = items.length
  const completados = items.filter(i => i.completado).length
  const pct = total > 0 ? Math.round((completados / total) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Checklist de Evidencias
          </p>
          {total > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {completados}/{total}
            </span>
          )}
        </div>
        {canEdit && (
          <Button size="sm" variant="ghost" onClick={() => setShowForm(v => !v)} className="h-7 px-2 text-xs gap-1">
            <Plus className="w-3 h-3" />
            Agregar
          </Button>
        )}
      </div>

      {/* Barra de progreso */}
      {total > 0 && (
        <div className="mb-3">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${pct}%`,
                backgroundColor: pct === 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#3b82f6',
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{pct}% completado</p>
        </div>
      )}

      {/* Formulario nuevo ítem */}
      {showForm && canEdit && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={nuevaDesc}
            onChange={e => setNuevaDesc(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="Descripción del ítem (ej: Evidencia mes de Enero)"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <Button size="sm" onClick={handleAdd} disabled={!nuevaDesc.trim() || agregando} className="h-8">
            {agregando ? '...' : 'Agregar'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setNuevaDesc('') }} className="h-8">
            Cancelar
          </Button>
        </div>
      )}

      {/* Lista de ítems */}
      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-3">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">
          {canEdit ? 'Sin ítems. Agrega el primero con el botón +' : 'Sin ítems de checklist'}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className={`rounded-lg border px-3 py-2.5 transition-colors ${
                item.completado
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-border/50 bg-muted/30'
              }`}
            >
              <div className="flex items-start gap-2">
                {/* Ícono estado */}
                <div className="mt-0.5 flex-shrink-0">
                  {item.completado
                    ? <CheckSquare className="w-4 h-4 text-green-500" />
                    : <Square className="w-4 h-4 text-muted-foreground" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${item.completado ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {item.descripcion}
                  </p>

                  {/* Link evidencia si está completado */}
                  {item.completado && item.link_evidencia && (
                    <a
                      href={item.link_evidencia}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1 text-xs text-blue-500 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver evidencia en ISOLUS
                    </a>
                  )}

                  {/* Meta si completado */}
                  {item.completado && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Completado por {item.completado_por ?? '—'}
                      {item.fecha_completado && ` · ${new Date(item.fecha_completado).toLocaleDateString('es-CO')}`}
                    </p>
                  )}

                  {/* Input link antes de completar */}
                  {!item.completado && canEdit && (
                    <input
                      type="url"
                      value={linkEnEdicion[item.id] ?? ''}
                      onChange={e => setLinkEnEdicion(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Link ISOLUS (opcional)"
                      className="mt-1.5 w-full rounded border border-input bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  )}
                </div>

                {/* Acciones */}
                {canEdit && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {item.completado ? (
                      <button
                        onClick={() => handleReopen(item.id)}
                        disabled={completando === item.id}
                        title="Reabrir"
                        className="p-1 rounded text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleComplete(item)}
                        disabled={completando === item.id}
                        title="Marcar como completado"
                        className="p-1 rounded text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Eliminar"
                      className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
