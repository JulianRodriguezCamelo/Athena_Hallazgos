'use client'

import { useState, useMemo, useRef } from 'react'
import { X } from 'lucide-react'
import { ResponsiveGridLayout, verticalCompactor, useContainerWidth } from 'react-grid-layout'
import type { Layout, LayoutItem } from 'react-grid-layout'
import { WIDGET_REGISTRY } from '@/lib/widgetRegistry'
import type { DashboardBlock } from '@/types'
import type { WidgetRenderContext } from '@/lib/widgetRegistry'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

interface Props {
  layout: DashboardBlock[]
  ctx: WidgetRenderContext
  isEditing: boolean
  onLayoutChange: (items: { i: string; x: number; y: number; w: number; h: number }[]) => void
  onRemove: (id: string) => void
}

const COLS = { lg: 12, md: 12, sm: 6, xs: 2, xxs: 2 }
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }

// Breakpoints where the stored layout lives (desktop)
const DESKTOP_BPS = new Set(['lg', 'md'])

function buildStackedLayout(blocks: DashboardBlock[], cols: number): LayoutItem[] {
  const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x)
  let y = 0
  return sorted.map((block) => {
    const item: LayoutItem = { i: block.id, x: 0, y, w: cols, h: block.h, minW: 1, minH: 1 }
    y += block.h
    return item
  })
}

export function DashboardGrid({ layout, ctx, isEditing, onLayoutChange, onRemove }: Props) {
  const { width, containerRef } = useContainerWidth()
  const [currentBp, setCurrentBp] = useState<string>('lg')
  // Guard: prevent corrupting the desktop layout when the grid fires onLayoutChange
  // during a breakpoint transition. We only forward changes made on lg/md.
  const bpRef = useRef(currentBp)
  bpRef.current = currentBp

  // Determine which blocks have valid widgets based on layout + stable role.
  // Rendering happens inline (not here) so ctx updates (pagination, data) propagate live.
  const visibleBlocks = useMemo(() =>
    layout.filter((block) => {
      const entry = WIDGET_REGISTRY[block.widgetType]
      if (!entry) return false
      return entry.render(ctx, block) != null
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout]
  )

  const lgItems: LayoutItem[] = visibleBlocks.map((block) => ({
    i: block.id, x: block.x, y: block.y, w: block.w, h: block.h, minW: 2, minH: 1,
  }))

  const smItems = useMemo(() => buildStackedLayout(visibleBlocks, COLS.sm), [visibleBlocks])
  const xsItems = useMemo(() => buildStackedLayout(visibleBlocks, COLS.xs), [visibleBlocks])

  // Minimum viable pixel width — avoids layout thrash during fast resize transitions
  const safeWidth = Math.max(width ?? 1200, 200)

  function handleBreakpointChange(bp: string) {
    setCurrentBp(bp)
  }

  function handleLayoutChange(current: Layout) {
    // Ignore changes fired when the grid recalculates for non-desktop breakpoints;
    // those use stacked coordinates that would corrupt the stored desktop layout.
    if (!DESKTOP_BPS.has(bpRef.current)) return
    onLayoutChange(current.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })))
  }

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <ResponsiveGridLayout
        width={safeWidth}
        className="layout"
        layouts={{ lg: lgItems, md: lgItems, sm: smItems, xs: xsItems, xxs: xsItems }}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={70}
        dragConfig={{ enabled: isEditing }}
        resizeConfig={{ enabled: isEditing }}
        compactor={verticalCompactor}
        onBreakpointChange={handleBreakpointChange}
        onLayoutChange={handleLayoutChange}
        margin={[12, 12]}
      >
        {visibleBlocks.map((block) => {
          const content = WIDGET_REGISTRY[block.widgetType].render(ctx, block)
          return (
            <div key={block.id} className="relative group">
              {isEditing && (
                <>
                  <div className="absolute inset-0 ring-2 ring-primary/30 ring-dashed rounded-xl pointer-events-none z-10" />
                  <button
                    type="button"
                    onClick={() => onRemove(block.id)}
                    className="absolute top-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100
                               bg-destructive text-destructive-foreground rounded-full p-0.5
                               transition-opacity shadow-sm"
                    title="Quitar widget"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              )}
              <div className="h-full overflow-hidden">
                {content}
              </div>
            </div>
          )
        })}
      </ResponsiveGridLayout>
    </div>
  )
}
