'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  History,
} from 'lucide-react'
import { uploadsApi } from '@/lib/api'
import { formatDateTime, cn } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import Modal from '@/components/ui/Modal'

interface UploadRecord {
  id: number
  filename_original: string
  uploaded_by: string
  total_registros: number
  registros_exitosos: number
  registros_fallidos: number
  estado: 'procesando' | 'completado' | 'error'
  errores: string | null
  uploaded_at: string
}

const estadoConfig = {
  procesando: { icon: <Clock className="w-4 h-4" />,        badge: 'warning' as const,  label: 'Procesando' },
  completado: { icon: <CheckCircle className="w-4 h-4" />,  badge: 'success' as const,  label: 'Completado' },
  error:      { icon: <XCircle className="w-4 h-4" />,      badge: 'destructive' as const, label: 'Error' },
}

export default function UploadsPage() {
  const pathname = usePathname()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string; errors?: string[] } | null>(null)
  const [history, setHistory] = useState<UploadRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UploadRecord | null>(null)

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res = await uploadsApi.history()
      const d = res.data as { uploads?: UploadRecord[]; history?: UploadRecord[] }
      setHistory(d.uploads ?? d.history ?? [])
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setResult({ ok: false, msg: 'Solo se permiten archivos .xlsx o .xls' })
      return
    }
    setUploading(true)
    setResult(null)
    try {
      const res = await uploadsApi.upload(file)
      const d = res.data as { upload: UploadRecord; errores?: string[] }
      const u: UploadRecord = d.upload
      setResult({
        ok: true,
        msg: `Procesado: ${u.registros_exitosos} registros guardados correctamente.`,
        errors: d.errores,
      })
      loadHistory()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al procesar el archivo'
      setResult({ ok: false, msg })
    } finally {
      setUploading(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, []) // eslint-disable-line

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-6 max-w-4xl mx-auto">

        {/* Upload card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary px-6 py-4">
            <CardTitle className="text-sm font-semibold text-primary-foreground">
              Carga masiva de datos
            </CardTitle>
            <p className="text-xs text-primary-foreground/60 mt-0.5">
              Sube un archivo Excel (.xlsx / .xls) con los hallazgos ERO
            </p>
          </CardHeader>
          <Separator />
          <CardContent className="p-6 space-y-4">

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all',
                dragging
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-primary hover:bg-muted/40'
              )}
            >
              <div className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center transition-colors',
                dragging ? 'bg-accent/10' : 'bg-muted'
              )}>
                <FileSpreadsheet className={cn('w-8 h-8', dragging ? 'text-accent' : 'text-primary')} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">
                  {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo o haz clic para seleccionar'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos: .xlsx, .xls · Máximo 16 MB
                </p>
              </div>
              {uploading ? (
                <div className="flex items-center gap-2 text-sm text-primary font-medium">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Procesando…
                </div>
              ) : (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <Upload className="w-3.5 h-3.5" />
                  Seleccionar archivo
                </Button>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
            />

            {/* Result */}
            {result && (
              <div className={cn(
                'rounded-lg p-4 flex items-start gap-3 border',
                result.ok
                  ? 'bg-green-50 border-green-200'
                  : 'bg-destructive/5 border-destructive/20'
              )}>
                {result.ok
                  ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                }
                <div className="flex-1">
                  <p className={cn('text-sm font-medium', result.ok ? 'text-green-800' : 'text-destructive')}>
                    {result.msg}
                  </p>
                  {result.errors && result.errors.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {result.errors.map((e, i) => (
                        <li key={i} className="text-xs text-amber-700 flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                          {e}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Column reference */}
            <div className="rounded-lg bg-muted/50 border border-border p-4">
              <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-2">
                Columnas esperadas en el Excel
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Código del evento', 'Descripción', 'Fecha inicial del evento',
                  'Fecha de finalización del evento', 'Dependencia que reporta el ERO',
                  'Reportado para', 'Estado', 'Reportado por', 'Observaciones',
                  'Aplicativo que afecta el ERO', 'Fecha de cierre proyectada',
                  'ID del Plan de Acción', 'Nombre del Plan de Acción',
                  'Descripción del Plan de Acción', 'Estado del plan de acción',
                  'Responsable del Plan de Acción', 'Estado de la acción',
                  'Responsable de la acción', 'Prórroga', 'Fecha de cierre final de la prórroga',
                ].map((col) => (
                  <Badge key={col} variant="outline" className="text-[10px] font-normal">
                    {col}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History card */}
        <Card className="overflow-hidden">
          <CardHeader className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Historial de cargas
              </CardTitle>
              <Badge variant="secondary">{history.length} cargas</Badge>
            </div>
          </CardHeader>
          <Separator />

          {loadingHistory ? (
            <CardContent className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </CardContent>
          ) : history.length === 0 ? (
            <CardContent className="flex flex-col items-center py-14 text-muted-foreground">
              <Upload className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm">Aún no hay cargas registradas</p>
            </CardContent>
          ) : (
            <div className="divide-y divide-border">
              {history.map((h) => {
                const cfg = estadoConfig[h.estado] ?? estadoConfig.completado
                return (
                  <div key={h.id}>
                    <div
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(expandedId === h.id ? null : h.id)}
                    >
                      <div className="shrink-0 text-muted-foreground">{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{h.filename_original}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateTime(h.uploaded_at)} · {h.uploaded_by ?? 'Sistema'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <Badge variant={cfg.badge}>{h.total_registros} regs.</Badge>
                        <p className="text-[10px] text-muted-foreground">
                          <span className="text-green-600 font-medium">{h.registros_exitosos} ok</span>
                          {h.registros_fallidos > 0 && (
                            <span className="text-destructive ml-1">{h.registros_fallidos} error</span>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-7 h-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(h)
                        }}
                        title="Eliminar carga"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <span className="text-muted-foreground shrink-0">
                        {expandedId === h.id
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />
                        }
                      </span>
                    </div>

                    {expandedId === h.id && h.errores && (
                      <div className="px-5 pb-4 bg-muted/20">
                        <p className="text-xs font-semibold text-amber-700 mb-2 pt-2">Errores detectados:</p>
                        <pre className="text-xs text-foreground/70 bg-background rounded-lg p-3 border border-border whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                          {h.errores}
                        </pre>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar carga"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            ¿Estás seguro de que deseas eliminar la carga{' '}
            <span className="font-semibold">&ldquo;{deleteTarget?.filename_original}&rdquo;</span>{' '}
            y sus <span className="font-semibold">{deleteTarget?.total_registros} registros</span>?
          </p>
          <p className="text-xs text-muted-foreground">Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteTarget) {
                  uploadsApi.delete(deleteTarget.id).then(() => loadHistory()).catch(() => {})
                  setDeleteTarget(null)
                }
              }}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  )
}
