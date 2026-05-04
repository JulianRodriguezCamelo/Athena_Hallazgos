'use client'

import { useState, useEffect, useMemo } from 'react'
import { Mail, Users, Search, CheckSquare, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { notificacionesApi } from '@/lib/api'

type Modo = 'todos' | 'seleccion'

interface Usuario {
  id: number
  nombre: string
  email: string
  rol: string
  dependencia: string | null
}

interface Props {
  open: boolean
  onClose: () => void
}

export function ModalCorreoMasivo({ open, onClose }: Props) {
  const [modo, setModo] = useState<Modo>('todos')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [cargando, setCargando] = useState(false)
  const [filtroDep, setFiltroDep] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set())
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<{ enviados: number; fallidos: number; total: number } | null>(null)

  useEffect(() => {
    if (!open) return
    setModo('todos')
    setSeleccionados(new Set())
    setAsunto('')
    setMensaje('')
    setError('')
    setResultado(null)
    setBusqueda('')
    setFiltroDep('')
    cargarUsuarios()
  }, [open])

  async function cargarUsuarios(dep?: string) {
    setCargando(true)
    try {
      const { data } = await notificacionesApi.usuariosParaMasivo(dep || undefined)
      setUsuarios(data.usuarios)
    } catch {
      setUsuarios([])
    } finally {
      setCargando(false)
    }
  }

  const dependencias = useMemo(() => {
    const set = new Set(usuarios.map(u => u.dependencia).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [usuarios])

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => {
      const matchDep = !filtroDep || u.dependencia?.toLowerCase().includes(filtroDep.toLowerCase())
      const matchBusqueda = !busqueda ||
        u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email.toLowerCase().includes(busqueda.toLowerCase())
      return matchDep && matchBusqueda
    })
  }, [usuarios, filtroDep, busqueda])

  function toggleUsuario(id: number) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleTodosFiltrados() {
    const ids = usuariosFiltrados.map(u => u.id)
    const todosSeleccionados = ids.every(id => seleccionados.has(id))
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (todosSeleccionados) {
        ids.forEach(id => next.delete(id))
      } else {
        ids.forEach(id => next.add(id))
      }
      return next
    })
  }

  const destinatariosFinales = modo === 'todos'
    ? usuarios.map(u => u.id)
    : Array.from(seleccionados)

  async function handleEnviar() {
    if (!asunto.trim() || !mensaje.trim()) {
      setError('El asunto y el mensaje son obligatorios.')
      return
    }
    if (destinatariosFinales.length === 0) {
      setError('No hay destinatarios seleccionados.')
      return
    }
    setSending(true)
    setError('')
    try {
      const { data } = await notificacionesApi.enviarMasiva({
        user_ids: destinatariosFinales,
        asunto,
        mensaje,
      })
      setResultado(data)
      setTimeout(() => { setResultado(null); onClose() }, 2500)
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message
      setError(msg || 'Error al enviar los correos.')
    } finally {
      setSending(false)
    }
  }

  const todosFiltr = usuariosFiltrados.every(u => seleccionados.has(u.id)) && usuariosFiltrados.length > 0

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Envío masivo de correos
          </DialogTitle>
          <DialogDescription className="text-xs">
            Envía un mensaje personalizado a múltiples usuarios de tu vicepresidencia.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-1 pr-1">
          {/* Selector de modo */}
          <div className="flex gap-2">
            <button
              onClick={() => setModo('todos')}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                modo === 'todos'
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              <Users className="inline h-3.5 w-3.5 mr-1.5" />
              Todos en mi vicepresidencia
              {!cargando && <span className="ml-1.5 text-xs opacity-70">({usuarios.length})</span>}
            </button>
            <button
              onClick={() => setModo('seleccion')}
              className={`flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                modo === 'seleccion'
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              <CheckSquare className="inline h-3.5 w-3.5 mr-1.5" />
              Seleccionar usuarios
              {seleccionados.size > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({seleccionados.size} sel.)</span>
              )}
            </button>
          </div>

          {/* Panel de selección manual */}
          {modo === 'seleccion' && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o correo…"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <select
                  value={filtroDep}
                  onChange={e => setFiltroDep(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Todas las direcciones</option>
                  {dependencias.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {cargando ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando usuarios…
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1 pb-1 border-b border-border">
                    <button
                      onClick={toggleTodosFiltrados}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {todosFiltr
                        ? <CheckSquare className="h-3.5 w-3.5 text-orange-400" />
                        : <Square className="h-3.5 w-3.5" />}
                      Seleccionar todos ({usuariosFiltrados.length})
                    </button>
                    {seleccionados.size > 0 && (
                      <button
                        onClick={() => setSeleccionados(new Set())}
                        className="text-xs text-destructive hover:underline"
                      >
                        Limpiar selección
                      </button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {usuariosFiltrados.length === 0 && (
                      <p className="text-xs text-muted-foreground py-3 text-center">
                        No se encontraron usuarios con ese filtro.
                      </p>
                    )}
                    {usuariosFiltrados.map(u => (
                      <button
                        key={u.id}
                        onClick={() => toggleUsuario(u.id)}
                        className={`w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                          seleccionados.has(u.id)
                            ? 'bg-orange-500/10 text-foreground'
                            : 'hover:bg-muted/50 text-muted-foreground'
                        }`}
                      >
                        {seleccionados.has(u.id)
                          ? <CheckSquare className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                          : <Square className="h-3.5 w-3.5 shrink-0" />}
                        <span className="flex-1 truncate font-medium">{u.nombre}</span>
                        <span className="text-xs truncate max-w-[140px] opacity-60">{u.dependencia || u.rol}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Asunto y mensaje */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Asunto <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ej: Recordatorio — Hallazgos pendientes de cierre"
              value={asunto}
              onChange={e => setAsunto(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mensaje <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Escribe el cuerpo del mensaje que recibirán los destinatarios…"
              className="resize-none text-sm"
              rows={5}
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {resultado && (
            <p className="text-xs text-green-500">
              Enviado a {resultado.enviados} usuario{resultado.enviados !== 1 ? 's' : ''} correctamente.
              {resultado.fallidos > 0 && ` (${resultado.fallidos} con error)`}
            </p>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleEnviar}
            disabled={sending || !asunto.trim() || !mensaje.trim() || destinatariosFinales.length === 0}
            className="gap-1.5"
          >
            {sending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando…</>
              : <><Mail className="h-3.5 w-3.5" /> Enviar a {destinatariosFinales.length} usuario{destinatariosFinales.length !== 1 ? 's' : ''}</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
