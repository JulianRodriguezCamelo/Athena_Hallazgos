'use client'

import { useState, useCallback } from 'react'
import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import { DashboardGrid } from './DashboardGrid'
import { DashboardToolbar } from './DashboardToolbar'
import { WidgetPalette } from './WidgetPalette'
import { PageLoader } from '@/components/ui/Spinner'
import type { WidgetRenderContext } from '@/lib/widgetRegistry'
import type { WidgetType } from '@/types'

interface Props {
  role: 'vicepresidente' | 'directivo' | 'administrador'
  ctx: Omit<WidgetRenderContext, 'role'>
}

export function CustomizableDashboard({ role, ctx }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const {
    layout,
    isLoading,
    isSaving,
    isDirty,
    saveLayout,
    resetLayout,
    addWidget,
    removeWidget,
    onGridLayoutChange,
  } = useDashboardLayout(role)

  const handleSave = useCallback(() => {
    saveLayout(layout)
  }, [saveLayout, layout])

  if (isLoading) return <PageLoader />

  const fullCtx: WidgetRenderContext = { ...ctx, role }
  const currentWidgetTypes = layout.map((b) => b.widgetType)

  return (
    <div className="space-y-3">
      <DashboardToolbar
        isEditing={isEditing}
        isDirty={isDirty}
        isSaving={isSaving}
        onToggleEdit={() => setIsEditing((e) => !e)}
        onOpenPalette={() => setPaletteOpen(true)}
        onSave={handleSave}
        onReset={resetLayout}
      />

      <DashboardGrid
        layout={layout}
        ctx={fullCtx}
        isEditing={isEditing}
        onLayoutChange={onGridLayoutChange}
        onRemove={removeWidget}
      />

      <WidgetPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAdd={addWidget}
        currentWidgetTypes={currentWidgetTypes}
        role={role}
      />
    </div>
  )
}
