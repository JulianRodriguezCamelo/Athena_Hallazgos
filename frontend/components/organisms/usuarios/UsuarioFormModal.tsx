import { Input } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import type { UserRow } from './UsuariosTable'

export interface FormData {
  nombre: string
  email: string
  password: string
  rol: string
  vicepresidencia: string
  dependencia: string
}

const ROL_OPTIONS = [
  { value: 'vicepresidente', label: 'Vicepresidente' },
  { value: 'directivo',      label: 'Directivo' },
  { value: 'profesional',    label: 'Profesional' },
  { value: 'gestor',         label: 'Gestor' },
]

interface Props {
  open: boolean
  editing: UserRow | null
  form: FormData
  setForm: (f: FormData) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
  error: string
  vicepresidencias: string[]
  dependencias: string[]
}

export function UsuarioFormModal({
  open, editing, form, setForm, onSave, onClose, saving, error, vicepresidencias, dependencias,
}: Props) {
  const isVice = form.rol === 'vicepresidente'

  function handleRolChange(rol: string) {
    setForm({
      ...form,
      rol,
      dependencia: rol === 'vicepresidente' ? '' : form.dependencia,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
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
          <Select
            label="Rol"
            options={ROL_OPTIONS}
            value={form.rol}
            onChange={(e) => handleRolChange(e.target.value)}
          />
          <div className={isVice ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-2 gap-4'}>
            <Select
              label="Vicepresidencia"
              options={[
                { value: '', label: '— Sin vicepresidencia —' },
                ...vicepresidencias.map((v) => ({ value: v, label: v })),
              ]}
              value={form.vicepresidencia}
              onChange={(e) => setForm({ ...form, vicepresidencia: e.target.value })}
            />
            {!isVice && (
              <Select
                label="Dependencia / Dirección"
                options={[
                  { value: '', label: '— Sin dependencia —' },
                  ...dependencias.map((d) => ({ value: d, label: d })),
                ]}
                value={form.dependencia}
                onChange={(e) => setForm({ ...form, dependencia: e.target.value })}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button variant="default" onClick={onSave} loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
