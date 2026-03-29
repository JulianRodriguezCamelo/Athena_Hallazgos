'use client'

import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={cn('p-0 overflow-hidden', sizeMap[size])}>
        <DialogHeader className="px-6 py-4 bg-primary border-b border-primary/20">
          <DialogTitle className="text-base font-semibold text-primary-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="p-6">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
