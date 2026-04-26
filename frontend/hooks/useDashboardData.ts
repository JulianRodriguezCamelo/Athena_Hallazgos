import { useState, useEffect } from 'react'
import { dashboardApi } from '@/lib/api'
import type { Metrics, ChartItem, TimelineItem, UploadItem } from '@/types'

export function useDashboardData() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [porEstado, setPorEstado] = useState<ChartItem[]>([])
  const [porDependencia, setPorDependencia] = useState<ChartItem[]>([])
  const [porResponsable, setPorResponsable] = useState<ChartItem[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [porEstadoPlan, setPorEstadoPlan] = useState<ChartItem[]>([])
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  async function load(showRefresh = false) {
    if (showRefresh) setIsRefreshing(true)
    else setLoading(true)
    try {
      const [m, estado, dep, resp, time, plan, up] = await Promise.all([
        dashboardApi.metrics(),
        dashboardApi.porEstado(),
        dashboardApi.porDependencia(),
        dashboardApi.porResponsable(),
        dashboardApi.timeline(),
        dashboardApi.porEstadoPlan(),
        dashboardApi.uploadsRecientes(),
      ])

      setMetrics(m.data as Metrics)

      const estadoData = (estado.data as { data: { estado: string; total: number }[] }).data
      setPorEstado(estadoData.map((d) => ({ name: d.estado, value: d.total })))

      const depData = (dep.data as { data: { dependencia: string; total: number }[] }).data
      setPorDependencia(depData.map((d) => ({ name: d.dependencia, value: d.total })))

      const respData = (resp.data as { data: { responsable: string; total: number }[] }).data
      setPorResponsable(respData.map((d) => ({ name: d.responsable, value: d.total })))

      const timeData = (time.data as { data: { mes: string; total: number }[] }).data
      setTimeline(timeData.map((d) => ({ name: d.mes, value: d.total })))

      const planData = (plan.data as { data: { estado_plan: string; total: number }[] }).data
      setPorEstadoPlan(planData.map((d) => ({ name: d.estado_plan, value: d.total })))

      setUploads((up.data as { uploads: UploadItem[] }).uploads)
    } catch { /* silent */ } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  return { metrics, porEstado, porDependencia, porResponsable, timeline, porEstadoPlan, uploads, loading, isRefreshing, reload: load }
}
