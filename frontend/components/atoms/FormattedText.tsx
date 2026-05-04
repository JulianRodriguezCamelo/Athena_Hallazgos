import type { ReactNode } from 'react'
import { cn, cleanText } from '@/lib/utils'

interface Props {
  value: string | null | undefined
  className?: string
}

export function FormattedText({ value, className }: Props) {
  if (!value) return <span className="text-muted-foreground">—</span>

  const cleaned = cleanText(value)
  const lines = cleaned.split('\n').map((l) => l.trimEnd()).filter((l, i, arr) => {
    // Remove consecutive empty lines (keep max one blank line between paragraphs)
    if (l === '' && arr[i - 1] === '') return false
    return true
  })

  const elements: ReactNode[] = []
  let bulletBuffer: string[] = []

  function flushBullets() {
    if (bulletBuffer.length === 0) return
    elements.push(
      <ul key={`ul-${elements.length}`} className="list-disc list-outside pl-5 space-y-1">
        {bulletBuffer.map((b, i) => (
          <li key={i} className="text-sm text-foreground leading-relaxed">{b}</li>
        ))}
      </ul>
    )
    bulletBuffer = []
  }

  lines.forEach((line, i) => {
    const isBullet = /^[•\-–]\s/.test(line)
    if (isBullet) {
      bulletBuffer.push(line.replace(/^[•\-–]\s+/, ''))
    } else {
      flushBullets()
      if (line === '') {
        elements.push(<div key={`gap-${i}`} className="h-2" />)
      } else {
        elements.push(
          <p key={`p-${i}`} className="text-sm text-foreground leading-relaxed">{line}</p>
        )
      }
    }
  })
  flushBullets()

  return <div className={cn('space-y-1', className)}>{elements}</div>
}
