import { useState, useEffect, useCallback, useRef } from 'react'
import { directivoApi, dashboardApi } from '@/lib/api'
import { CHART_COLORS_HEX } from '@/types'
import type { MetricasDirectivo, ChartItem, PagedHallazgos, PagedActividades } from '@/types'

export function useDirectivoData() {
  const [metricas, setMetricas] = useState<MetricasDirectivo | null>(null)
  const [porEstado, setPorEstado] = useState<ChartItem[]>([])
  const [porEstadoPlan, setPorEstadoPlan] = useState<ChartItem[]>([])
  const [porEstadoAccion, setPorEstadoAccion] = useState<ChartItem[]>([])
  const [hallazgos, setHallazgos] = useState<PagedHallazgos | null>(null)
  const [actividades, setActividades] = useState<PagedActividades | null>(null)
  const [hPage, setHPage] = useState(1)
  const [aPage, setAPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadCharts = useCallback(async () => {
    const [met, acc, estado, plan] = await Promise.all([
      directivoApi.misMetricas(),
      directivoApi.porEstadoAccion(),
      dashboardApi.porEstado(),
      dashboardApi.porEstadoPlan(),
    ])
    setMetricas(met.data as MetricasDirectivo)
    const accData = (acc.data as { data: { estado: string; total: number }[] }).data
    setPorEstadoAccion(accData.map((d, i) => ({ name: d.estado, value: d.total, fill: CHART_COLORS_HEX[i % 5] })))
    const estadoData = (estado.data as { data: { estado: string; total: number }[] }).data
    setPorEstado(estadoData.map((d, i) => ({ name: d.estado, value: d.total, fill: CHART_COLORS_HEX[i % 5] })))
    const planData = (plan.data as { data: { estado_plan: string; total: number }[] }).data
    setPorEstadoPlan(planData.map((d, i) => ({ name: d.estado_plan, value: d.total, fill: CHART_COLORS_HEX[i % 5] })))
  }, [])

  const loadHallazgos = useCallback(async (p: number) => {
    try {
      const res = await directivoApi.misHallazgos(p)
      setHallazgos(res.data as PagedHallazgos)
    } catch { /* silent */ }
  }, [])

  const loadActividades = useCallback(async (p: number) => {
    try {
      const res = await directivoApi.misActividades(p)
      setActividades(res.data as PagedActividades)
    } catch { /* silent */ }
  }, [])

  async function load(refresh = false) {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    try {
      await Promise.all([loadCharts(), loadHallazgos(1), loadActividades(1)])
    } catch { /* silent */ } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const didMount = useRef(false)
  useEffect(() => { load() }, []) // eslint-disable-line

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return }
    loadHallazgos(hPage)
  }, [hPage, loadHallazgos])

  useEffect(() => { loadActividades(aPage) }, [aPage, loadActividades])

  return {
    metricas, porEstado, porEstadoPlan, porEstadoAccion,
    hallazgos, actividades, hPage, setHPage, aPage, setAPage,
    loading, refreshing, reload: load,
  }
}
