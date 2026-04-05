'use client'

import * as React from 'react'

interface CollapsibleContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextValue>({
  open: false,
  onOpenChange: () => {},
})

function Collapsible({
  open,
  onOpenChange,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange }}>
      <div className={className}>{children}</div>
    </CollapsibleContext.Provider>
  )
}

function CollapsibleTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode
  asChild?: boolean
}) {
  const ctx = React.useContext(CollapsibleContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
      onClick: (e: React.MouseEvent) => {
        const original = (children as React.ReactElement<React.HTMLAttributes<HTMLElement>>).props.onClick
        if (typeof original === 'function') original(e as React.MouseEvent<HTMLElement>)
        ctx.onOpenChange(!ctx.open)
      },
    })
  }

  return (
    <button type="button" onClick={() => ctx.onOpenChange(!ctx.open)}>
      {children}
    </button>
  )
}

function CollapsibleContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { open } = React.useContext(CollapsibleContext)
  if (!open) return null
  return <div className={className}>{children}</div>
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
