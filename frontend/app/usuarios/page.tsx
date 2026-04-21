'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { UserPlus, Pencil, UserX, UserCheck, Users } from 'lucide-react'
import { usersApi, hallazgosApi } from '@/lib/api'
import { ROL_LABELS, cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import DashboardShell from '@/components/layout/DashboardShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/input'
import Select from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface User {
  id: number
  nombre: string
  email: string
  rol: string
  dependencia: string | null
  activo: boolean
}

interface FormData {
  nombre: string
  email: string
  password: string
  rol: string
  dependencia: string
}

const EMPTY_FORM: FormData = { nombre: '', email: '', password: '', rol: 'profesional', dependencia: '' }

const ROL_OPTIONS = [
  { value: 'vicepresidente', label: 'Vicepresidente' },
  { value: 'directivo',      label: 'Directivo' },
  { value: 'profesional',    label: 'Profesional' },
  { value: 'gestor',         label: 'Gestor' },
]

const ROL_BADGE: Record<string, 'default' | 'accent' | 'ghost'> = {
  vicepresidente: 'default',
  directivo: 'accent',
  profesional: 'ghost',
}

export default function UsuariosPage() {
  const pathname = usePathname()
  const { isVice } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [dependencias, setDependencias] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, deps] = await Promise.all([
        usersApi.list(),
        hallazgosApi.dependencias(),
      ])
      setUsers((res.data as { users: User[] }).users)
      setDependencias((deps.data as { dependencias: string[] }).dependencias)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  function openEdit(u: User) {
    setEditing(u)
    setForm({ nombre: u.nombre, email: u.email, password: '', rol: u.rol, dependencia: u.dependencia ?? '' })
    setError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.nombre || !form.email || (!editing && !form.password)) {
      setError('Nombre, email y contraseña son obligatorios')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        nombre: form.nombre,
        email: form.email,
        rol: form.rol,
        dependencia: form.dependencia || null,
        ...(form.password && { password: form.password }),
      }
      if (editing) {
        await usersApi.update(editing.id, payload)
      } else {
        await usersApi.create({ ...payload, password: form.password })
      }
      setModalOpen(false)
      load()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al guardar'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(u: User) {
    try {
      if (u.activo) {
        await usersApi.delete(u.id)
      } else {
        await usersApi.update(u.id, { activo: true })
      }
      load()
    } catch {
      // silent
    }
  }

  if (!isVice) {
    return (
      <DashboardShell pathname={pathname}>
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          No tiene permisos para gestionar usuarios.
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary">Gestión de usuarios</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{users.length} usuarios registrados</p>
          </div>
          <Button onClick={openCreate} variant="default" size="sm" className="gap-1.5">
            <UserPlus className="w-4 h-4" />
            Nuevo usuario
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="px-5 py-3 border-b border-border">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Usuarios del sistema
            </CardTitle>
          </CardHeader>

          {loading ? (
            <CardContent className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary hover:bg-primary">
                    {['Nombre', 'Email', 'Rol', 'Dependencia', 'Estado', 'Acciones'].map((h) => (
                      <TableHead key={h} className="text-primary-foreground font-semibold text-xs whitespace-nowrap py-3">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow
                      key={u.id}
                      className={cn('transition-colors', !u.activo && 'opacity-50')}
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                              {u.nombre.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm text-foreground">{u.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={ROL_BADGE[u.rol] ?? 'ghost'}>
                          {ROL_LABELS[u.rol] ?? u.rol}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{u.dependencia ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={u.activo ? 'success' : 'ghost'}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(u)}
                            className="w-7 h-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(u)}
                            className={cn(
                              'w-7 h-7',
                              u.activo
                                ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                                : 'text-muted-foreground hover:text-green-600 hover:bg-green-50'
                            )}
                            title={u.activo ? 'Desactivar' : 'Activar'}
                          >
                            {u.activo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="p-0 overflow-hidden max-w-lg">
          <DialogHeader className="px-6 py-4 bg-primary border-b border-primary/20">
            <DialogTitle className="text-base font-semibold text-primary-foreground">
              {editing ? 'Editar usuario' : 'Nuevo usuario'}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}
            <Input
              label="Nombre completo"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre del usuario"
            />
            <Input
              label="Correo electrónico"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@fiduprevisora.com"
            />
            <Input
              label={editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Rol"
                options={ROL_OPTIONS}
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
              />
              <Select
                label="Dependencia / Dirección"
                options={[
                  { value: '', label: '— Sin dependencia —' },
                  ...dependencias.map((d) => ({ value: d, label: d })),
                ]}
                value={form.dependencia}
                onChange={(e) => setForm({ ...form, dependencia: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="default" onClick={handleSave} loading={saving}>
                {editing ? 'Guardar cambios' : 'Crear usuario'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
