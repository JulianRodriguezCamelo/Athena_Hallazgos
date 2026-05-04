'use client'

import { useState, useEffect } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, FileWarning, ListChecks, Calendar, AlertCircle } from 'lucide-react'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
import DashboardShell from '@/components/layout/DashboardShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/atoms/StatusBadge'
import { DetailField } from '@/components/atoms/DetailField'
import { FormattedText } from '@/components/atoms/FormattedText'
import { PageLoader } from '@/components/ui/Spinner'
import { hallazgosApi } from '@/lib/api'
import type { Hallazgo, Actividad } from '@/types'

export default function HallazgoDetailPage() {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const id = Number(params.id)

  const [hallazgo, setHallazgo] = useState<Hallazgo | null>(null)
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      hallazgosApi.get(id),
      hallazgosApi.actividades(id),
    ])
      .then(([hRes, aRes]) => {
        if (cancelled) return
        const hData = hRes.data as { hallazgo: Hallazgo }
        setHallazgo(hData.hallazgo)
        const aData = aRes.data as { actividades: Actividad[] }
        setActividades(aData.actividades ?? [])
      })
      .catch(() => { if (!cancelled) setError('No se pudo cargar el hallazgo') })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [id])

  return (
    <DashboardShell pathname={pathname}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <PageLoader />
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="h-10 w-10 text-destructive/50" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => router.back()}>Volver</Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && hallazgo && (
          <>
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileWarning className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-bold text-foreground font-mono">
                    {hallazgo.codigo_del_hallazgo ?? `Hallazgo #${id}`}
                  </h1>
                  <StatusBadge value={hallazgo.estado} />
                </div>
                {hallazgo.fecha_cierre_proyectada && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Cierre proyectado: {formatDateTime(hallazgo.fecha_cierre_proyectada)}
                  </p>
                )}
              </div>
            </div>

            {/* Descripción */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Descripción
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/40 rounded-lg p-4">
                  <FormattedText value={hallazgo.descripcion} />
                </div>
              </CardContent>
            </Card>

            {/* Detalles */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Información del Hallazgo
                </CardTitle>
              </CardHeader>
              <Separator />
              <CardContent className="pt-5">
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <DetailField label="Código del hallazgo" value={hallazgo.codigo_del_hallazgo} />
                  <DetailField label="Estado" value={hallazgo.estado} />
                  <DetailField label="Vicepresidencia" value={hallazgo.vicepresidencia} />
                  <DetailField label="Dirección" value={hallazgo.direccion} />
                  <DetailField label="Dependencia ERO" value={hallazgo.dependencia_reporta_ero} />
                  <DetailField label="Reportado para" value={hallazgo.reportado_para} />
                  <DetailField label="Reportado por" value={hallazgo.reportado_por} />
                  <DetailField label="Aplicativo afecta ERO" value={hallazgo.aplicativo_afecta_ero} />
                  <DetailField label="Fecha inicial" value={formatDate(hallazgo.fecha_inicial_evento)} />
                  <DetailField label="Fecha finalización" value={formatDate(hallazgo.fecha_finalizacion_evento)} />
                  <DetailField label="Fecha cierre proyectada" value={formatDate(hallazgo.fecha_cierre_proyectada)} />
                  <DetailField label="Prórroga" value={hallazgo.prorroga} />
                  <DetailField label="Fecha cierre prórroga" value={formatDate(hallazgo.fecha_cierre_final_prorroga)} />
                </div>
                {hallazgo.observaciones && (
                  <div className="mt-5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Observaciones
                    </p>
                    <div className="bg-muted/40 rounded-lg p-4">
                      <FormattedText value={hallazgo.observaciones} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actividades */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Actividades
                  </CardTitle>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {actividades.length} {actividades.length === 1 ? 'actividad' : 'actividades'}
                  </span>
                </div>
                <CardDescription>Acciones asociadas a este hallazgo</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                {actividades.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ListChecks className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">No hay actividades registradas para este hallazgo.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {actividades.map((act, idx) => (
                      <div
                        key={act.id}
                        className="rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-sm"
                      >
                        <div className="flex items-start gap-3 px-4 py-3 bg-muted/30 border-b border-border/60">
                          <span className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="flex-1 min-w-0 text-sm font-medium text-foreground leading-snug">
                            {act.descripcion ?? '—'}
                          </p>
                          {act.estado_accion && (
                            <StatusBadge value={act.estado_accion} className="shrink-0" />
                          )}
                        </div>
                        <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3">
                          {act.responsable && <DetailField label="Responsable plan" value={act.responsable} />}
                          {act.estado_accion && <DetailField label="Estado acción" value={act.estado_accion} />}
                          {act.responsable_accion && <DetailField label="Responsable acción" value={act.responsable_accion} />}
                          {act.fecha_compromiso && (
                            <DetailField label="Fecha compromiso" value={formatDate(act.fecha_compromiso)} />
                          )}
                          {act.prorroga && <DetailField label="Prórroga" value={act.prorroga} />}
                          {act.fecha_prorroga && (
                            <DetailField label="Fecha prórroga" value={formatDate(act.fecha_prorroga)} />
                          )}
                        </div>
                        {act.observaciones && (
                          <div className="px-4 pb-3">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              Observaciones
                            </p>
                            <div className="bg-muted/40 rounded-lg p-3">
                              <FormattedText value={act.observaciones} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
