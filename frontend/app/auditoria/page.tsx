'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Shield, Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import DashboardShell from '@/components/layout/DashboardShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { auditApi } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'

interface AuditLog {
  id: number
  user_nombre: string
  action: string
  entity_type: string
  entity_id: number | null
  changes: Record<string, [unknown, unknown]> | string | null
  ip_address: string | null
  created_at: string
}

interface Meta {
  total: number
  pages: number
  page: number
}

const ACTION_LABELS: Record<string, string> = {
  update_hallazgo: 'Actualización hallazgo',
  create_user: 'Creación usuario',
  update_user: 'Actualización usuario',
  delete_user: 'Eliminación usuario',
  upload_excel: 'Carga Excel',
  delete_upload: 'Eliminación carga',
}

const ENTITY_COLORS: Record<string, string> = {
  hallazgo: 'bg-blue-500/10 text-blue-400',
  user: 'bg-violet-500/10 text-violet-400',
  upload: 'bg-orange-500/10 text-orange-400',
}

function ChangesCell({ changes }: { changes: AuditLog['changes'] }) {
  if (!changes || typeof changes === 'string') return <span className="text-muted-foreground/40">—</span>

  const entries = Object.entries(changes)
  if (entries.length === 0) return <span className="text-muted-foreground/40">—</span>

  return (
    <div className="space-y-1">
      {entries.slice(0, 3).map(([campo, [antes, despues]]) => (
        <div key={campo} className="text-[11px] leading-tight">
          <span className="text-muted-foreground font-medium">{campo}: </span>
          <span className="text-red-400/80 line-through">{String(antes ?? '—').slice(0, 30)}</span>
          <span className="text-muted-foreground mx-1">→</span>
          <span className="text-green-400/80">{String(despues ?? '—').slice(0, 30)}</span>
        </div>
      ))}
      {entries.length > 3 && (
        <span className="text-[10px] text-muted-foreground">+{entries.length - 3} más</span>
      )}
    </div>
  )
}

export default function AuditoriaPage() {
  const pathname = usePathname()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [meta, setMeta] = useState<Meta>({ total: 0, pages: 1, page: 1 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [entityType, setEntityType] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await auditApi.list({
        page,
        per_page: 50,
        action: search || undefined,
        entity_type: entityType || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      })
      const data = res.data as { logs: AuditLog[]; total: number; pages: number; page: number }
      setLogs(data.logs)
      setMeta({ total: data.total, pages: data.pages, page: data.page })
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [page, search, entityType, desde, hasta])

  useEffect(() => { load() }, [load])

  useEffect(() => { setPage(1) }, [search, entityType, desde, hasta])

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Auditoría del sistema</h1>
              <p className="text-xs text-muted-foreground">{meta.total.toLocaleString()} registros</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por acción..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <select
                value={entityType}
                onChange={e => setEntityType(e.target.value)}
                className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Todos los tipos</option>
                <option value="hallazgo">Hallazgo</option>
                <option value="user">Usuario</option>
                <option value="upload">Carga Excel</option>
              </select>
              <input
                type="date"
                value={desde}
                onChange={e => setDesde(e.target.value)}
                className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                title="Desde"
              />
              <input
                type="date"
                value={hasta}
                onChange={e => setHasta(e.target.value)}
                className="text-sm bg-background border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                title="Hasta"
              />
              {(search || entityType || desde || hasta) && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setEntityType(''); setDesde(''); setHasta('') }}>
                  Limpiar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Registro de actividad
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                Cargando registros...
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <Shield className="h-10 w-10 opacity-20" />
                <p className="text-sm">Sin registros de auditoría</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Fecha</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Usuario</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Acción</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Entidad</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Cambios</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-foreground">{log.user_nombre}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-foreground">
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ENTITY_COLORS[log.entity_type] ?? 'bg-muted text-muted-foreground'}`}>
                              {log.entity_type}
                            </span>
                            {log.entity_id && (
                              <span className="text-xs text-muted-foreground">#{log.entity_id}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[260px]">
                          <ChangesCell changes={log.changes} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground/60 font-mono">
                          {log.ip_address ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {meta.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Página {meta.page} de {meta.pages} · {meta.total} registros
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                    disabled={page >= meta.pages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
