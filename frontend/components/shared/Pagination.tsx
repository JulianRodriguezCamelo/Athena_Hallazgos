'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  page: number
  pages: number
  onChange: (p: number) => void
  className?: string
}

export function Pagination({ page, pages, onChange, className }: PaginationProps) {
  if (pages <= 1) return null

  const ws = 2
  let start = Math.max(1, page - ws)
  let end = Math.min(pages, page + ws)
  if (end - start < ws * 2) {
    if (start === 1) end = Math.min(pages, start + ws * 2)
    else start = Math.max(1, end - ws * 2)
  }
  const nums: (number | '...')[] = []
  if (start > 1) { nums.push(1); if (start > 2) nums.push('...') }
  for (let p = start; p <= end; p++) nums.push(p)
  if (end < pages) { if (end < pages - 1) nums.push('...'); nums.push(pages) }

  return (
    <div className={`flex items-center justify-center gap-1 ${className ?? ''}`}>
      <Button variant="outline" size="icon" className="w-8 h-8" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="w-3.5 h-3.5" />
      </Button>
      {nums.map((n, i) =>
        n === '...' ? (
          <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground">…</span>
        ) : (
          <Button key={n} variant={n === page ? 'default' : 'ghost'} size="icon" className="w-8 h-8 text-xs" onClick={() => onChange(n)}>
            {n}
          </Button>
        )
      )}
      <Button variant="outline" size="icon" className="w-8 h-8" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}
