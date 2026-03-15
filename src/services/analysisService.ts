import type {
  AnalysisSummary,
  ChartData,
  GenomeContextPoint,
  ReportFilters,
  RunComparisonSummary,
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

const normalizeText = (value: string) => value.trim().toLowerCase()

const variantKey = (variant: VariantAnnotation) =>
  `${variant.chromosome}:${variant.position}:${variant.reference}>${variant.alternate}`

const geneKey = (variant: VariantAnnotation) =>
  variant.geneId ?? variant.geneSymbol

const sortAlpha = (items: Iterable<string>) =>
  [...items].filter(Boolean).sort((left, right) => left.localeCompare(right))

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
      counts[variant.predictedImpact] =
        (counts[variant.predictedImpact] ?? 0) + 1
    })

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: colors[name as keyof typeof colors],
    }))
  },

  buildGenomeContextPoints(
    variants: VariantAnnotation[],
  ): GenomeContextPoint[] {
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

  filterReports(reports: AnalysisSummary[], filters: ReportFilters) {
    const search = filters.search ? normalizeText(filters.search) : ''

    return reports.filter((report) => {
      if (search) {
        const haystack = normalizeText(
          [
            report.id,
            report.sampleId,
            report.fileName,
            report.speciesId,
            report.assemblyId,
            report.focusGene,
            report.format,
            report.status,
            report.statusDetail ?? '',
          ].join(' '),
        )

        if (!haystack.includes(search)) {
          return false
        }
      }

      if (filters.speciesId && filters.speciesId !== 'all') {
        if (report.speciesId !== filters.speciesId) {
          return false
        }
      }

      if (filters.status && filters.status !== 'all') {
        if (report.status !== filters.status) {
          return false
        }
      }

      if (filters.format && filters.format !== 'all') {
        if (report.format !== filters.format) {
          return false
        }
      }

      return true
    })
  },

  compareRuns(
    leftSummary: AnalysisSummary,
    rightSummary: AnalysisSummary,
    leftVariants: VariantAnnotation[],
    rightVariants: VariantAnnotation[],
  ): RunComparisonSummary {
    const leftVariantKeys = new Set(leftVariants.map(variantKey))
    const rightVariantKeys = new Set(rightVariants.map(variantKey))
    const leftGeneKeys = new Set(leftVariants.map(geneKey).filter(Boolean))
    const rightGeneKeys = new Set(rightVariants.map(geneKey).filter(Boolean))

    const sharedVariantKeys = [...leftVariantKeys].filter((key) =>
      rightVariantKeys.has(key),
    )
    const leftOnlyVariantKeys = [...leftVariantKeys].filter(
      (key) => !rightVariantKeys.has(key),
    )
    const rightOnlyVariantKeys = [...rightVariantKeys].filter(
      (key) => !leftVariantKeys.has(key),
    )

    const sharedGenes = sortAlpha(
      [...leftGeneKeys].filter((key) => rightGeneKeys.has(key)),
    )
    const leftOnlyGenes = sortAlpha(
      [...leftGeneKeys].filter((key) => !rightGeneKeys.has(key)),
    )
    const rightOnlyGenes = sortAlpha(
      [...rightGeneKeys].filter((key) => !leftGeneKeys.has(key)),
    )

    return {
      sharedVariantCount: sharedVariantKeys.length,
      leftOnlyVariantCount: leftOnlyVariantKeys.length,
      rightOnlyVariantCount: rightOnlyVariantKeys.length,
      sharedGeneCount: sharedGenes.length,
      leftOnlyGeneCount: leftOnlyGenes.length,
      rightOnlyGeneCount: rightOnlyGenes.length,
      variantCountDelta: leftSummary.variantCount - rightSummary.variantCount,
      highImpactDelta:
        leftSummary.highImpactVariants - rightSummary.highImpactVariants,
      meanDepthDelta: Number(
        (leftSummary.meanDepth - rightSummary.meanDepth).toFixed(1),
      ),
      meanQualityDelta: Number(
        (leftSummary.meanQuality - rightSummary.meanQuality).toFixed(1),
      ),
      sharedGenes,
      leftOnlyGenes,
      rightOnlyGenes,
    }
  },
}
