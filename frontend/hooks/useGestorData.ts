import { useState, useEffect, useCallback } from 'react'
import { gestorApi } from '@/lib/api'
import { CHART_COLORS_HEX } from '@/types'
import type { MetricasGestor, ChartItem, RetrasadoRow, BitacoraEntry, ResponsableCritico } from '@/types'
import type { HallazgoRow, ActividadRow } from '@/types'

export function useGestorData() {
  const [metricas, setMetricas] = useState<MetricasGestor | null>(null)
  const [porEstado, setPorEstado] = useState<ChartItem[]>([])
  const [porEstadoPlan, setPorEstadoPlan] = useState<ChartItem[]>([])
  const [porSemaforo, setPorSemaforo] = useState<ChartItem[]>([])
  const [tiempoPromedio, setTiempoPromedio] = useState<ChartItem[]>([])
  const [topRetrasados, setTopRetrasados] = useState<RetrasadoRow[]>([])
  const [hallazgos, setHallazgos] = useState<HallazgoRow[]>([])
  const [actividades, setActividades] = useState<ActividadRow[]>([])
  const [bitacora, setBitacora] = useState<BitacoraEntry[]>([])
  const [responsablesCriticos, setResponsablesCriticos] = useState<ResponsableCritico[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    try {
      const [metR, estR, planR, semR, hR, aR, respR, bitR, tpR, trR] = await Promise.all([
        gestorApi.misMetricas(),
        gestorApi.porEstado(),
        gestorApi.porEstadoPlan(),
        gestorApi.porSemaforo(),
        gestorApi.hallazgos(1, 100),
        gestorApi.actividades(1, 200),
        gestorApi.responsablesCriticos(),
        gestorApi.bitacora(),
        gestorApi.tiempoPromedio(),
        gestorApi.topRetrasados(),
      ])

      setMetricas(metR.data as MetricasGestor)

      const eD = (estR.data as { data: { name: string; value: number }[] }).data
      setPorEstado(eD.map((d, i) => ({ ...d, fill: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] })))

      const pD = (planR.data as { data: { name: string; value: number }[] }).data
      setPorEstadoPlan(pD.map((d, i) => ({ ...d, fill: CHART_COLORS_HEX[i % CHART_COLORS_HEX.length] })))

      setPorSemaforo((semR.data as { data: ChartItem[] }).data)
      setHallazgos((hR.data as { hallazgos: HallazgoRow[] }).hallazgos)
      setActividades((aR.data as { actividades: ActividadRow[] }).actividades)
      setResponsablesCriticos((respR.data as { data: ResponsableCritico[] }).data)
      setBitacora((bitR.data as { entries: BitacoraEntry[] }).entries)
      setTiempoPromedio((tpR.data as { data: { name: string; value: number }[] }).data)
      setTopRetrasados((trR.data as { data: RetrasadoRow[] }).data)
    } catch { /* silent */ } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return {
    metricas, porEstado, porEstadoPlan, porSemaforo, tiempoPromedio,
    topRetrasados, hallazgos, actividades, bitacora, responsablesCriticos,
    loading, refreshing, reload: load,
  }
}
