'use client'

import { useRef, useState } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usersApi } from '@/lib/api'

interface BulkResult {
  creados: number
  omitidos: number
  total_leidos: number
  errores_parseo: string[]
  omitidos_detalle: { email: string; razon: string }[]
}

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function BulkUploadModal({ open, onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<BulkResult | null>(null)
  const [error, setError] = useState('')

  function handleClose() {
    setFile(null)
    setResult(null)
    setError('')
    onClose()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
    setError('')
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')
    setResult(null)
    try {
      const res = await usersApi.bulkUpload(file)
      setResult(res.data)
      if (res.data.creados > 0) onSuccess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al cargar el archivo'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Carga masiva de usuarios" size="lg">
      <div className="space-y-5">
        {/* File selector */}
        {!result && (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <FileSpreadsheet className="w-10 h-10 text-primary/60" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {file ? file.name : 'Seleccionar archivo Excel'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Formatos soportados: .xlsx, .xls
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Format hint */}
        {!result && (
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Columnas requeridas en el archivo:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
              {[
                ['Código Usuario', 'identificador (referencia)'],
                ['Nombre Completo', 'nombre del usuario'],
                ['Correo', 'email de acceso'],
                ['Contraseña', 'contraseña inicial'],
                ['Rol', 'Profesional / Directivo / Vicepresidente / Gestor'],
                ['Dependencia', 'área o dirección'],
                ['Estado', 'Activo / Inactivo'],
              ].map(([col, desc]) => (
                <div key={col} className="flex gap-1.5">
                  <span className="font-medium text-foreground">{col}:</span>
                  <span>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Result summary */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{result.creados}</p>
                <p className="text-xs text-green-600">Creados</p>
              </div>
              <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-yellow-700">{result.omitidos}</p>
                <p className="text-xs text-yellow-600">Omitidos</p>
              </div>
              <div className="rounded-lg bg-muted border border-border p-3 text-center">
                <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{result.total_leidos}</p>
                <p className="text-xs text-muted-foreground">Total leídos</p>
              </div>
            </div>

            {result.omitidos_detalle.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">Omitidos:</p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.omitidos_detalle.map((o, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="ghost" className="shrink-0">{o.email}</Badge>
                      <span>{o.razon}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errores_parseo.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-foreground">Advertencias de parseo:</p>
                <div className="max-h-28 overflow-y-auto space-y-0.5">
                  {result.errores_parseo.map((e, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{e}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          {result ? (
            <Button onClick={handleClose} size="sm">Cerrar</Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={uploading}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Cargando…' : 'Cargar usuarios'}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
