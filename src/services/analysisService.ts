import type {
  ChartData,
  GenomeContextPoint,
  VariantAnnotation,
  VariantFilters,
} from '@/types/genome'

const chromosomeRank = (chromosome: string) => {
  const normalized = chromosome.replace('chr', '').toUpperCase()
  const numeric = Number(normalized)

  if (Number.isFinite(numeric)) {
    return numeric
  }

  if (normalized === 'C') {
    return 100
  }

  if (normalized === 'M') {
    return 101
  }

  return 999
}

const colorByIndex = (index: number) =>
  ['#7dd3fc', '#f59e0b', '#34d399', '#f87171', '#a78bfa'][index % 5]

export const analysisService = {
  calculateChromosomeDistribution(variants: VariantAnnotation[]): ChartData[] {
    const counts: Record<string, number> = {}

    variants.forEach((variant) => {
      counts[variant.chromosome] = (counts[variant.chromosome] ?? 0) + 1
    })

    return Object.entries(counts)
      .sort(([left], [right]) => chromosomeRank(left) - chromosomeRank(right))
      .map(([name, value], index) => ({
        name,
        value,
        fill: colorByIndex(index),
      }))
  },

  calculateImpactDistribution(variants: VariantAnnotation[]): ChartData[] {
    const counts: Record<string, number> = {}
    const colors = {
      HIGH: '#f97316',
      MODERATE: '#38bdf8',
      LOW: '#34d399',
      MODIFIER: '#a78bfa',
    } as const

    variants.forEach((variant) => {
      counts[variant.predictedImpact] = (counts[variant.predictedImpact] ?? 0) + 1
    })

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: colors[name as keyof typeof colors],
    }))
  },

  buildGenomeContextPoints(variants: VariantAnnotation[]): GenomeContextPoint[] {
    return [...variants]
      .sort(
        (left, right) =>
          chromosomeRank(left.chromosome) - chromosomeRank(right.chromosome) ||
          left.position - right.position,
      )
      .map((variant, index) => ({
        id: variant.id,
        geneSymbol: variant.geneSymbol,
        chromosome: variant.chromosome,
        position: index + 1,
        score: variant.score,
        fill: colorByIndex(chromosomeRank(variant.chromosome)),
      }))
  },

  filterVariants(variants: VariantAnnotation[], filters: VariantFilters) {
    const search = filters.search?.trim().toLowerCase()

    return variants.filter((variant) => {
      if (search) {
        const haystack = [
          variant.id,
          variant.geneId,
          variant.geneSymbol,
          variant.chromosome,
          variant.transcript,
          ...variant.consequenceTerms,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(search)) {
          return false
        }
      }

      if (filters.chromosome && filters.chromosome !== 'all') {
        if (variant.chromosome !== filters.chromosome) {
          return false
        }
      }

      if (filters.type && filters.type !== 'all') {
        if (variant.type !== filters.type) {
          return false
        }
      }

      if (filters.predictedImpact && filters.predictedImpact !== 'all') {
        if (variant.predictedImpact !== filters.predictedImpact) {
          return false
        }
      }

      return true
    })
  },
}
