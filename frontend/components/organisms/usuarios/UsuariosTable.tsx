import { Pencil, UserX, UserCheck, Users } from 'lucide-react'
import { cn, ROL_LABELS } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export interface UserRow {
  id: number
  nombre: string
  email: string
  rol: string
  vicepresidencia: string | null
  dependencia: string | null
  activo: boolean
}

const ROL_BADGE: Record<string, 'default' | 'accent' | 'ghost'> = {
  vicepresidente: 'default',
  directivo: 'accent',
  profesional: 'ghost',
}

interface Props {
  users: UserRow[]
  loading: boolean
  onEdit: (u: UserRow) => void
  onToggleActive: (u: UserRow) => void
}

export function UsuariosTable({ users, loading, onEdit, onToggleActive }: Props) {
  return (
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
                {['Nombre', 'Email', 'Rol', 'Vicepresidencia', 'Dependencia', 'Estado', 'Acciones'].map((h) => (
                  <TableHead key={h} className="text-primary-foreground font-semibold text-xs whitespace-nowrap py-3">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className={cn('transition-colors', !u.activo && 'opacity-50')}>
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
                    <Badge variant={ROL_BADGE[u.rol] ?? 'ghost'}>{ROL_LABELS[u.rol] ?? u.rol}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{u.vicepresidencia ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{u.dependencia ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={u.activo ? 'success' : 'ghost'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(u)}
                        className="w-7 h-7 text-muted-foreground hover:text-primary hover:bg-primary/10" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onToggleActive(u)}
                        className={cn('w-7 h-7',
                          u.activo
                            ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                            : 'text-muted-foreground hover:text-green-600 hover:bg-green-50',
                        )}
                        title={u.activo ? 'Desactivar' : 'Activar'}>
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
  )
}
