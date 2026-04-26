import { KpiRow, type KpiItem } from '@/components/molecules/KpiRow'

interface Props {
  primaryItems: KpiItem[]
  secondaryItems?: KpiItem[]
}

export function KpiOverviewSection({ primaryItems, secondaryItems }: Props) {
  return (
    <div className="space-y-4">
      <KpiRow items={primaryItems} columns={primaryItems.length <= 4 ? 4 : 5} />
      {secondaryItems && secondaryItems.length > 0 && (
        <KpiRow items={secondaryItems} columns={secondaryItems.length <= 4 ? 4 : 5} />
      )}
    </div>
  )
}
