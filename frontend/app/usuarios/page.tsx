'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { usersApi, hallazgosApi } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import DashboardShell from '@/components/layout/DashboardShell'
import { Button } from '@/components/ui/button'
import { UsuariosTable, type UserRow } from '@/components/organisms/usuarios/UsuariosTable'
import { UsuarioFormModal, type FormData } from '@/components/organisms/usuarios/UsuarioFormModal'
import { PageHeader } from '@/components/templates/PageHeader'

const EMPTY_FORM: FormData = {
  nombre: '', email: '', password: '', rol: 'profesional', vicepresidencia: '', dependencia: '',
}

export default function UsuariosPage() {
  const pathname = usePathname()
  const { isVice } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [vicepresidencias, setVicepresidencias] = useState<string[]>([])
  const [dependencias, setDependencias] = useState<string[]>([])

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

  async function toggleActive(u: UserRow) {
    try {
      if (u.activo) await usersApi.delete(u.id)
      else await usersApi.update(u.id, { activo: true })
      load()
    } catch { /* silent */ }
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
        <PageHeader
          title="Gestión de usuarios"
          description={`${users.length} usuarios registrados`}
          action={
            <Button onClick={openCreate} variant="default" size="sm" className="gap-1.5">
              <UserPlus className="w-4 h-4" />
              Nuevo usuario
            </Button>
          }
        />
        <UsuariosTable users={users} loading={loading} onEdit={openEdit} onToggleActive={toggleActive} />
      </div>
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
