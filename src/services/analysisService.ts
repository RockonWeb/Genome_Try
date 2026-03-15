import type {
  ChartData,
  ManhattanPoint,
  VariantFilters,
  GenomeVariant,
} from '@/types/genome'

const chromosomeRank = (chromosome: string) => {
  const normalized = chromosome.replace('chr', '')

  if (normalized === 'X') {
    return 23
  }

  if (normalized === 'Y') {
    return 24
  }

  return Number(normalized)
}

const colorByIndex = (index: number) =>
  index % 2 === 0 ? '#2dd4bf' : '#60a5fa'

export const analysisService = {
  calculateChromosomeDistribution(variants: GenomeVariant[]): ChartData[] {
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

  calculateMutationTypeStats(variants: GenomeVariant[]): ChartData[] {
    const counts: Record<string, number> = {}
    const colors = {
      SNV: '#2dd4bf',
      Insertion: '#60a5fa',
      Deletion: '#f97316',
      CNV: '#fb7185',
    } as const

    variants.forEach((variant) => {
      counts[variant.type] = (counts[variant.type] ?? 0) + 1
    })

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: colors[name as keyof typeof colors],
    }))
  },

  buildManhattanPoints(variants: GenomeVariant[]): ManhattanPoint[] {
    return [...variants]
      .sort(
        (left, right) =>
          chromosomeRank(left.chromosome) - chromosomeRank(right.chromosome) ||
          left.position - right.position,
      )
      .map((variant, index) => ({
        id: variant.id,
        gene: variant.gene,
        chromosome: variant.chromosome,
        position: index + 1,
        score: Number((-Math.log10(Math.max(variant.pValue, 1e-12))).toFixed(2)),
        fill: colorByIndex(chromosomeRank(variant.chromosome)),
      }))
  },

  filterVariants(variants: GenomeVariant[], filters: VariantFilters) {
    const search = filters.search?.trim().toLowerCase()

    return variants.filter((variant) => {
      if (search) {
        const haystack = [
          variant.id,
          variant.gene,
          variant.chromosome,
          variant.transcript,
          variant.clinicalSignificance,
        ]
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

      if (
        filters.clinicalSignificance &&
        filters.clinicalSignificance !== 'all'
      ) {
        if (variant.clinicalSignificance !== filters.clinicalSignificance) {
          return false
        }
      }

      return true
    })
  },
}
