'use client'

import { useState, useEffect, useMemo } from 'react'
import { Bell, CheckSquare, Square, Users, Search, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usersApi, notificacionesApi } from '@/lib/api'
import type { UserRow } from '@/components/organisms/usuarios/UsuariosTable'

export function NotificacionChecklistCard() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [enviando, setEnviando] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    usersApi.list()
      .then((res) => {
        const data = res.data as { users: UserRow[] }
        setUsers((data.users ?? []).filter(u => u.activo))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      u.nombre.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.dependencia ?? '').toLowerCase().includes(q),
    )
  }, [users, search])

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const allFilteredIds = filtered.map(u => u.id)
    const allSelected = allFilteredIds.every(id => selected.has(id))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) {
        allFilteredIds.forEach(id => next.delete(id))
      } else {
        allFilteredIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  function clearSearch() {
    setSearch('')
  }

  const selectedUsers = users.filter(u => selected.has(u.id))
  const allFilteredSelected = filtered.length > 0 && filtered.every(u => selected.has(u.id))

  async function handleEnviar() {
    if (selectedUsers.length === 0) return
    setEnviando(true)
    setFeedback(null)
    let ok = 0
    let fail = 0
    for (const u of selectedUsers) {
      try {
        await notificacionesApi.enviarPersonalizada({ nombre: u.nombre, correo: u.email })
        ok++
      } catch {
        fail++
      }
    }
    setFeedback(
      fail === 0
        ? { ok: true, msg: `Notificación enviada a ${ok} destinatario(s)` }
        : { ok: false, msg: `${ok} enviados, ${fail} fallaron` },
    )
    setEnviando(false)
    setTimeout(() => setFeedback(null), 5000)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">Envío de Notificaciones</CardTitle>
            <CardDescription className="text-xs">Busca y selecciona los destinatarios</CardDescription>
          </div>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo o dependencia..."
            className="w-full rounded-lg border border-input bg-background pl-8 pr-8 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Select all (filtered) */}
        {filtered.length > 0 && (
          <button
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={toggleAll}
          >
            {allFilteredSelected
              ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
              : <Square className="h-3.5 w-3.5" />}
            {allFilteredSelected ? 'Deseleccionar visibles' : `Seleccionar los ${filtered.length} visibles`}
          </button>
        )}

        {/* User list */}
        <div className="space-y-1.5 overflow-y-auto pr-0.5" style={{ maxHeight: '220px' }}>
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-6">Cargando usuarios...</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Sin resultados para "{search}"</p>
          ) : (
            filtered.map((u) => {
              const isSelected = selected.has(u.id)
              return (
                <button
                  key={u.id}
                  onClick={() => toggle(u.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors',
                    isSelected
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-muted/20 border-transparent hover:border-border',
                  )}
                >
                  {isSelected
                    ? <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                    : <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.nombre}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {u.email}{u.dependencia ? ` · ${u.dependencia}` : ''}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Selected count badge */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground border border-border/50 rounded-lg px-3 py-1.5 bg-muted/20">
            <span>{selected.size} destinatario(s) seleccionado(s)</span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-destructive hover:underline"
            >
              Limpiar
            </button>
          </div>
        )}

        {feedback && (
          <p className={cn('text-xs text-center', feedback.ok ? 'text-green-500' : 'text-destructive')}>
            {feedback.msg}
          </p>
        )}

        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={handleEnviar}
          disabled={enviando || selected.size === 0}
        >
          <Bell className="h-3.5 w-3.5" />
          {enviando ? 'Enviando…' : `Enviar notificación a ${selected.size} destinatario(s)`}
        </Button>
      </CardContent>
    </Card>
  )
}
