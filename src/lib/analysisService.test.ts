import assert from 'node:assert/strict'
import test from 'node:test'
import { analysisService } from '@/services/analysisService'
import type { AnalysisSummary, VariantAnnotation } from '@/types/genome'

const createReport = (
  overrides: Partial<AnalysisSummary>,
): AnalysisSummary => ({
  id: 'PS-AT-0001',
  sampleId: 'PS-AT-0001',
  fileName: 'sample.vcf',
  format: 'VCF',
  speciesId: 'arabidopsis_thaliana',
  assemblyId: 'TAIR10',
  date: '2026-03-15',
  status: 'completed',
  variantCount: 4,
  highImpactVariants: 1,
  meanDepth: 44.2,
  meanQuality: 91.5,
  fileSizeMb: 128,
  focusGene: 'NAC001',
  insightCount: 9,
  createdAt: '2026-03-15T10:00:00.000Z',
  updatedAt: '2026-03-15T10:00:00.000Z',
  statusDetail: null,
  pipelineMode: 'vcf_live',
  storedFilePath: './.phyto/uploads/PS-AT-0001/original.vcf',
  ...overrides,
})

const createVariant = (
  id: string,
  geneId: string,
  position: number,
): VariantAnnotation => ({
  id,
  geneId,
  geneSymbol: geneId,
  chromosome: '1',
  position,
  reference: 'G',
  alternate: 'A',
  type: 'SNV',
  predictedImpact: 'MODERATE',
  consequenceTerms: ['missense_variant'],
  featureType: 'gene',
  transcript: `${geneId}.1`,
  source: 'test',
  evidenceType: 'computational',
  quality: 90,
  depth: 40,
  score: 4,
  lastUpdated: '2026-03-15',
  notes: 'test',
})

test('filterReports applies search, species, status, and format filters', () => {
  const reports = [
    createReport({
      id: 'A',
      sampleId: 'A',
      fileName: 'alpha.vcf',
      focusGene: 'NAC001',
    }),
    createReport({
      id: 'B',
      sampleId: 'B',
      fileName: 'beta.bam',
      format: 'BAM',
      status: 'queued',
      pipelineMode: 'deferred_backend',
      speciesId: 'oryza_sativa',
      assemblyId: 'IRGSP-1.0',
      focusGene: 'OsGene',
    }),
    createReport({
      id: 'C',
      sampleId: 'C',
      fileName: 'gamma.vcf',
      status: 'failed',
      statusDetail: 'annotation failed',
    }),
  ]

  const filtered = analysisService.filterReports(reports, {
    search: 'annotation failed',
    speciesId: 'all',
    status: 'failed',
    format: 'all',
  })

  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].id, 'C')

  const speciesAndFormat = analysisService.filterReports(reports, {
    speciesId: 'oryza_sativa',
    format: 'BAM',
  })

  assert.equal(speciesAndFormat.length, 1)
  assert.equal(speciesAndFormat[0].id, 'B')
})

test('compareRuns calculates shared and unique genes and variant deltas', () => {
  const leftSummary = createReport({
    id: 'LEFT',
    sampleId: 'LEFT',
    variantCount: 3,
    highImpactVariants: 2,
    meanDepth: 50,
    meanQuality: 93.2,
  })
  const rightSummary = createReport({
    id: 'RIGHT',
    sampleId: 'RIGHT',
    variantCount: 2,
    highImpactVariants: 1,
    meanDepth: 44.5,
    meanQuality: 89.1,
  })

  const comparison = analysisService.compareRuns(
    leftSummary,
    rightSummary,
    [
      createVariant('L1', 'AT1G01010', 100),
      createVariant('L2', 'AT2G43010', 200),
    ],
    [
      createVariant('R1', 'AT1G01010', 100),
      createVariant('R2', 'AT3G24650', 300),
    ],
  )

  assert.equal(comparison.sharedVariantCount, 1)
  assert.equal(comparison.leftOnlyVariantCount, 1)
  assert.equal(comparison.rightOnlyVariantCount, 1)
  assert.equal(comparison.sharedGeneCount, 1)
  assert.equal(comparison.leftOnlyGeneCount, 1)
  assert.equal(comparison.rightOnlyGeneCount, 1)
  assert.equal(comparison.variantCountDelta, 1)
  assert.equal(comparison.highImpactDelta, 1)
  assert.equal(comparison.meanDepthDelta, 5.5)
  assert.equal(comparison.meanQualityDelta, 4.1)
  assert.deepEqual(comparison.sharedGenes, ['AT1G01010'])
})
