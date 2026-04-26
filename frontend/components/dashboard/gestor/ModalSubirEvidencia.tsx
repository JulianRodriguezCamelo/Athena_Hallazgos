'use client'

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { uploadsApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import type { HallazgoRow } from './types'

interface Props {
  h: HallazgoRow | null
  open: boolean
  onClose: () => void
}

export function ModalSubirEvidencia({ h, open, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleClose() {
    setFile(null)
    setResult(null)
    onClose()
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setResult(null)
    try {
      await uploadsApi.upload(file)
      setResult({ ok: true, msg: 'Evidencia subida correctamente.' })
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch {
      setResult({ ok: false, msg: 'Error al subir el archivo. Intenta de nuevo.' })
    } finally {
      setUploading(false)
    }
  }

  if (!h) return null
  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Subir evidencia — {h.codigo_del_hallazgo ?? `#${h.id}`}
          </DialogTitle>
          <DialogDescription className="text-xs">Selecciona un archivo (PDF, imagen, Excel)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx"
            className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file && <p className="text-xs text-muted-foreground">Archivo: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
          {result && <p className={cn('text-xs', result.ok ? 'text-green-500' : 'text-destructive')}>{result.msg}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={uploading}>Cancelar</Button>
          <Button size="sm" onClick={handleUpload} disabled={!file || uploading}>{uploading ? 'Subiendo…' : 'Subir'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
