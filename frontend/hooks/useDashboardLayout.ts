import { useState, useEffect, useCallback, useRef } from 'react'
import { preferencesApi } from '@/lib/api'
import { WIDGET_REGISTRY, VP_DEFAULT_LAYOUT, DIRECTIVO_DEFAULT_LAYOUT } from '@/lib/widgetRegistry'
import type { DashboardBlock, WidgetType } from '@/types'

type Role = 'vicepresidente' | 'directivo' | 'administrador'

function getDefault(role: Role): DashboardBlock[] {
  if (role === 'directivo') return DIRECTIVO_DEFAULT_LAYOUT
  return VP_DEFAULT_LAYOUT
}

interface RglItem {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export function useDashboardLayout(role: Role) {
  const [layout, setLayout] = useState<DashboardBlock[]>(getDefault(role))
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const savedRef = useRef<string>(JSON.stringify(getDefault(role)))

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await preferencesApi.getMyPreferences()
        const prefs = (res.data as { preferences: { dashboard_layout: DashboardBlock[] | null } | null }).preferences
        if (!cancelled && prefs?.dashboard_layout) {
          const valid = prefs.dashboard_layout.filter((b) => b.widgetType in WIDGET_REGISTRY)
          setLayout(valid)
          savedRef.current = JSON.stringify(valid)
        }
      } catch { /* use defaults */ } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, []) // role is stable during session

  const isDirty = JSON.stringify(layout) !== savedRef.current

  const saveLayout = useCallback(async (currentLayout: DashboardBlock[]) => {
    setIsSaving(true)
    try {
      await preferencesApi.saveMyPreferences(currentLayout)
      savedRef.current = JSON.stringify(currentLayout)
    } catch { /* silent */ } finally {
      setIsSaving(false)
    }
  }, [])

  const resetLayout = useCallback(() => {
    const def = getDefault(role)
    setLayout(def)
  }, [role])

  const addWidget = useCallback((widgetType: WidgetType) => {
    const meta = WIDGET_REGISTRY[widgetType]?.meta
    if (!meta) return
    const newBlock: DashboardBlock = {
      id: `${widgetType}-${Date.now()}`,
      widgetType,
      x: 0,
      y: Infinity,
      w: meta.defaultSize.w,
      h: meta.defaultSize.h,
    }
    setLayout((prev) => [...prev, newBlock])
  }, [])

  const removeWidget = useCallback((id: string) => {
    setLayout((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const onGridLayoutChange = useCallback((rglLayout: RglItem[]) => {
    setLayout((prev) =>
      prev.map((block) => {
        const updated = rglLayout.find((l) => l.i === block.id)
        if (!updated) return block
        return { ...block, x: updated.x, y: updated.y, w: updated.w, h: updated.h }
      })
    )
  }, [])

  return {
    layout,
    isLoading,
    isSaving,
    isDirty,
    saveLayout,
    resetLayout,
    addWidget,
    removeWidget,
    onGridLayoutChange,
  }
}
