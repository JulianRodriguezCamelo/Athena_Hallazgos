import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  page: number
  pages: number
  onChange: (p: number) => void
  className?: string
}

function buildWindow(page: number, pages: number): (number | '...')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const nums: (number | '...')[] = [1]
  if (page > 3) nums.push('...')
  for (let n = Math.max(2, page - 1); n <= Math.min(pages - 1, page + 1); n++) nums.push(n)
  if (page < pages - 2) nums.push('...')
  nums.push(pages)
  return nums
}

export function Pagination({ page, pages, onChange, className }: Props) {
  if (pages <= 1) return null
  const nums = buildWindow(page, pages)
  return (
    <div className={`flex items-center justify-between pt-4 ${className ?? ''}`}>
      <p className="text-xs text-muted-foreground">
        Página {page} de {pages}
      </p>
      <div className="flex items-center gap-1">
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
    </div>
  )
}
