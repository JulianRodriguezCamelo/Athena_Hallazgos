'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { UserPlus, Upload, Search, X, Trash2 } from 'lucide-react'
import { usersApi, hallazgosApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { ROL_LABELS } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { UsuariosTable, type UserRow } from '@/components/organisms/usuarios/UsuariosTable'
import { UsuarioFormModal, type FormData } from '@/components/organisms/usuarios/UsuarioFormModal'
import { BulkUploadModal } from '@/components/organisms/usuarios/BulkUploadModal'
import { PageHeader } from '@/components/templates/PageHeader'

const EMPTY_FORM: FormData = {
  nombre: '', email: '', password: '', rol: 'profesional', vicepresidencia: '', dependencia: '',
}

const ROL_OPTIONS = Object.entries(ROL_LABELS).map(([value, label]) => ({ value, label }))

export default function UsuariosPage() {
  const pathname = usePathname()
  const { isVice, isAdmin } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [vicepresidencias, setVicepresidencias] = useState<string[]>([])
  const [dependencias, setDependencias] = useState<string[]>([])
  const [bulkOpen, setBulkOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterDep, setFilterDep] = useState('')
  const [filterRol, setFilterRol] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, vices, dirs] = await Promise.all([
        usersApi.list(),
        hallazgosApi.vicepresidencias(),
        hallazgosApi.direcciones(),
      ])
      setUsers((res.data as { users: UserRow[] }).users)
      setVicepresidencias((vices.data as { vicepresidencias: string[] }).vicepresidencias)
      setDependencias((dirs.data as { direcciones: string[] }).direcciones)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Unique dependencias from loaded users
  const depOptions = useMemo(() => {
    const unique = Array.from(new Set(users.map(u => u.dependencia).filter(Boolean) as string[])).sort()
    return unique.map(d => ({ value: d, label: d }))
  }, [users])

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim()
    return users.filter(u => {
      if (q && !u.nombre.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
      if (filterDep && u.dependencia !== filterDep) return false
      if (filterRol && u.rol !== filterRol) return false
      return true
    })
  }, [users, search, filterDep, filterRol])

  const hasFilters = search !== '' || filterDep !== '' || filterRol !== ''

  function clearFilters() {
    setSearch('')
    setFilterDep('')
    setFilterRol('')
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  function openEdit(u: UserRow) {
    setEditing(u)
    setForm({
      nombre: u.nombre, email: u.email, password: '',
      rol: u.rol, vicepresidencia: u.vicepresidencia ?? '', dependencia: u.dependencia ?? '',
    })
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
        nombre: form.nombre, email: form.email, rol: form.rol,
        vicepresidencia: form.vicepresidencia || null,
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

  async function handleReset() {
    if (!confirm('¿Eliminar TODOS los usuarios excepto el administrador? Esta acción no se puede deshacer.')) return
    setResetting(true)
    try {
      await usersApi.reset()
      load()
    } catch { /* silent */ } finally {
      setResetting(false)
    }
  }

  async function toggleActive(u: UserRow) {
    try {
      if (u.activo) await usersApi.delete(u.id)
      else await usersApi.update(u.id, { activo: true })
      load()
    } catch { /* silent */ }
  }

  if (!isVice && !isAdmin) {
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
        <PageHeader
          title="Gestión de usuarios"
          description={
            hasFilters
              ? `${filteredUsers.length} de ${users.length} usuarios`
              : `${users.length} usuarios registrados`
          }
          action={
            <div className="flex gap-2">
              {isAdmin && (
                <Button onClick={handleReset} variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30" disabled={resetting}>
                  <Trash2 className="w-4 h-4" />
                  {resetting ? 'Eliminando…' : 'Resetear usuarios'}
                </Button>
              )}
              <Button onClick={() => setBulkOpen(true)} variant="outline" size="sm" className="gap-1.5">
                <Upload className="w-4 h-4" />
                Carga masiva
              </Button>
              <Button onClick={openCreate} variant="default" size="sm" className="gap-1.5">
                <UserPlus className="w-4 h-4" />
                Nuevo usuario
              </Button>
            </div>
          }
        />

        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nombre o correo…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="min-w-[180px]">
            <Select
              options={depOptions}
              value={filterDep}
              onChange={e => setFilterDep(e.target.value)}
              placeholder="Todas las dependencias"
              className="h-9 text-sm"
            />
          </div>
          <div className="min-w-[150px]">
            <Select
              options={ROL_OPTIONS}
              value={filterRol}
              onChange={e => setFilterRol(e.target.value)}
              placeholder="Todos los roles"
              className="h-9 text-sm"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground h-9">
              <X className="w-3.5 h-3.5" />
              Limpiar
            </Button>
          )}
        </div>

        <UsuariosTable users={filteredUsers} loading={loading} onEdit={openEdit} onToggleActive={toggleActive} />
      </div>

      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={load}
      />
      <UsuarioFormModal
        open={modalOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
        saving={saving}
        error={error}
        vicepresidencias={vicepresidencias}
        dependencias={dependencias}
      />
    </DashboardShell>
  )
}
