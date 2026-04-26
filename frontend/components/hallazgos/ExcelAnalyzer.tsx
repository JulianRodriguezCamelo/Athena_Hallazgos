'use client'

import { useRef, useState, type ElementType } from 'react'
import {
  FileSpreadsheet, X, Upload, AlertTriangle, Clock,
  XCircle, ClipboardList, ListChecks, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface AnalysisResult {
  total: number
  total_actividades: number
  vencidos: number
  con_prorroga: number
  por_estado: { estado: string; total: number }[]
  por_dependencia: { nombre: string; total: number }[]
  por_responsable: { nombre: string; total: number }[]
  errores: string[]
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-32 truncate text-muted-foreground shrink-0" title={label}>{label}</span>
      <div className="flex-1 bg-muted rounded-full h-2 min-w-0">
        <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-semibold text-foreground shrink-0">{value}</span>
    </div>
  )
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number; color?: string; icon?: ElementType }) {
  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all hover:shadow-md',
      color === 'red' ? 'border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 dark:border-red-900/50 dark:from-red-950/30 dark:to-red-950/10'
        : color === 'amber' ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-amber-950/10'
        : color === 'emerald' ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-emerald-950/10'
        : 'border-border bg-gradient-to-br from-muted/50 to-muted/20'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn(
            'text-3xl font-bold tracking-tight',
            color === 'red' ? 'text-red-600 dark:text-red-400'
              : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
              : color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-foreground'
          )}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
        </div>
        {Icon && (
          <div className={cn(
            'p-2 rounded-lg',
            color === 'red' ? 'bg-red-100 dark:bg-red-900/30'
              : color === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30'
              : color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30'
              : 'bg-muted'
          )}>
            <Icon className={cn(
              'w-4 h-4',
              color === 'red' ? 'text-red-600 dark:text-red-400'
                : color === 'amber' ? 'text-amber-600 dark:text-amber-400'
                : color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground'
            )} />
          </div>
        )}
      </div>
    </div>
  )
}

export function ExcelAnalyzer({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const analyze = async (file: File) => {
    setAnalyzing(true)
    setResult(null)
    setError(null)
    setFileName(file.name)
    try {
      const res = await uploadsApi.analyze(file)
      setResult(res.data as AnalysisResult)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Error al analizar el archivo'
      setError(msg)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) analyze(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) analyze(file)
  }

  const reset = () => {
    setResult(null)
    setError(null)
    setFileName(null)
    setShowErrors(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const maxDep = result ? Math.max(...result.por_dependencia.map(d => d.total), 1) : 1
  const maxResp = result ? Math.max(...result.por_responsable.map(r => r.total), 1) : 1
  const maxEst = result ? Math.max(...result.por_estado.map(e => e.total), 1) : 1

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.02] to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Analizador de Excel</CardTitle>
              {fileName && !analyzing && <CardDescription className="mt-0.5">{fileName}</CardDescription>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result && (
              <Button variant="outline" size="sm" onClick={reset} className="text-xs">
                <Upload className="w-3.5 h-3.5 mr-1.5" />Nuevo archivo
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="w-8 h-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!result && !analyzing && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200',
              dragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50 hover:bg-muted/30'
            )}
          >
            <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleChange} />
            <div className="w-14 h-14 rounded-full bg-muted/80 flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Arrastra un archivo Excel aquí</p>
            <p className="text-xs text-muted-foreground mt-1.5">o haz clic para seleccionar · .xlsx / .xls</p>
          </div>
        )}

        {analyzing && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Analizando archivo…</p>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Error al procesar el archivo</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Hallazgos" value={result.total} icon={ClipboardList} />
              <StatCard label="Actividades" value={result.total_actividades} icon={ListChecks} />
              <StatCard label="Vencidos" value={result.vencidos} color="red" icon={XCircle} />
              <StatCard label="Con prórroga" value={result.con_prorroga} color="amber" icon={Clock} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por estado</h4>
                <div className="space-y-2">
                  {result.por_estado.map(e => <BarRow key={e.estado} label={e.estado} value={e.total} max={maxEst} />)}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top dependencias</h4>
                <div className="space-y-2">
                  {result.por_dependencia.map(d => <BarRow key={d.nombre} label={d.nombre} value={d.total} max={maxDep} />)}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top responsables</h4>
                <div className="space-y-2">
                  {result.por_responsable.map(r => <BarRow key={r.nombre} label={r.nombre} value={r.total} max={maxResp} />)}
                </div>
              </div>
            </div>

            {result.errores.length > 0 && (
              <Collapsible open={showErrors} onOpenChange={setShowErrors}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-left transition-colors hover:bg-amber-100/50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        {result.errores.length} error{result.errores.length !== 1 ? 'es' : ''} de parseo
                      </span>
                    </div>
                    {showErrors ? <ChevronUp className="w-4 h-4 text-amber-500" /> : <ChevronDown className="w-4 h-4 text-amber-500" />}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 rounded-lg bg-muted/50 space-y-1.5">
                    {result.errores.map((e, i) => <p key={i} className="text-xs text-muted-foreground font-mono">{e}</p>)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
