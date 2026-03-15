import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createAnalysisResult } from '@/lib/server/analysisFactory'
import {
  getAnalysisById,
  listAnalyses,
  saveAnalysisResult,
} from '@/lib/server/analysisRepository'
import { resetDatabaseForTests } from '@/lib/server/database'
import { fetchCachedJson } from '@/lib/server/sourceCache'
import type { VariantAnnotation, WorkbenchData } from '@/types/genome'

const originalFetch = global.fetch

const createTempDataDir = () => mkdtempSync(path.join(tmpdir(), 'phytoscope-'))

const createVariant = (id: string, impact: VariantAnnotation['predictedImpact']): VariantAnnotation => ({
  id,
  geneId: 'AT1G01010',
  geneSymbol: 'NAC001',
  chromosome: '1',
  position: 3631,
  reference: 'G',
  alternate: 'A',
  type: 'SNV',
  predictedImpact: impact,
  consequenceTerms: ['missense_variant'],
  featureType: 'gene',
  transcript: 'AT1G01010.1',
  source: 'test',
  evidenceType: 'computational',
  quality: 91,
  depth: 42,
  score: 4.5,
  lastUpdated: '2026-03-15',
  notes: 'test variant',
})

const createWorkbench = (): WorkbenchData => ({
  query: {
    raw: 'AT1G01010',
    normalized: 'AT1G01010',
    type: 'gene',
    speciesId: 'arabidopsis_thaliana',
    assemblyId: 'TAIR10',
    geneId: 'AT1G01010',
    geneSymbol: 'NAC001',
  },
  species: {
    id: 'arabidopsis_thaliana',
    label: 'Arabidopsis thaliana',
    commonName: 'Thale cress',
    taxonId: 3702,
    defaultAssemblyId: 'TAIR10',
    assemblies: [
      {
        id: 'TAIR10',
        name: 'TAIR10',
        description: 'test assembly',
      },
    ],
    capabilities: {
      arabidopsisDepth: true,
      expression: 'full',
      regulation: 'full',
      literature: 'full',
    },
  },
  gene: {
    id: 'AT1G01010',
    symbol: 'NAC001',
    name: 'Test gene',
    speciesId: 'arabidopsis_thaliana',
    assemblyId: 'TAIR10',
    biotype: 'protein_coding',
    description: 'Test description',
    aliases: ['NAC001'],
    location: {
      chromosome: '1',
      start: 3631,
      end: 5899,
      strand: 1,
    },
    sourceSummaries: [],
    externalLinks: [],
    lastUpdated: '2026-03-15',
  },
  locus: {
    chromosome: '1',
    start: 3631,
    end: 5899,
    regionLabel: '1:3631-5899',
    overlappingGeneIds: ['AT1G01010'],
    source: 'test',
  },
  variants: [createVariant('VAR-1', 'HIGH')],
  expression: null,
  regulation: [],
  functionTerms: [],
  interactions: [],
  orthology: [],
  literature: [],
  supportingLinks: [],
  sourceStatus: [],
})

test.afterEach(() => {
  global.fetch = originalFetch
  resetDatabaseForTests()
  delete process.env.PHYTOSCOPE_DATA_DIR
})

test('saveAnalysisResult persists and reloads serialized payloads', () => {
  process.env.PHYTOSCOPE_DATA_DIR = createTempDataDir()
  resetDatabaseForTests()

  const workbench = createWorkbench()
  const result = createAnalysisResult({
    id: 'PS-AT-SERIALIZE',
    fileName: 'sample.vcf',
    fileSize: 1024 * 1024,
    speciesId: 'arabidopsis_thaliana',
    assemblyId: 'TAIR10',
    status: 'completed',
    pipelineMode: 'vcf_live',
    variants: workbench.variants,
    workbench,
    storedFilePath: './.phyto/uploads/PS-AT-SERIALIZE/original.vcf',
  })

  saveAnalysisResult(result)

  const saved = getAnalysisById(result.summary.id)
  assert.ok(saved)
  assert.equal(saved.summary.status, 'completed')
  assert.equal(saved.summary.pipelineMode, 'vcf_live')
  assert.equal(saved.summary.storedFilePath, './.phyto/uploads/PS-AT-SERIALIZE/original.vcf')
  assert.equal(saved.workbench?.gene?.id, 'AT1G01010')
  assert.equal(saved.variants[0]?.predictedImpact, 'HIGH')
})

test('listAnalyses keeps queued, completed, and failed runs ordered by createdAt', () => {
  process.env.PHYTOSCOPE_DATA_DIR = createTempDataDir()
  resetDatabaseForTests()

  const queued = createAnalysisResult({
    id: 'PS-AT-QUEUED',
    fileName: 'queued.bam',
    fileSize: 512,
    speciesId: 'arabidopsis_thaliana',
    assemblyId: 'TAIR10',
    status: 'queued',
    pipelineMode: 'deferred_backend',
    variants: [],
    workbench: null,
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
    statusDetail: 'Queued for backend pipeline.',
  })
  const completed = createAnalysisResult({
    id: 'PS-AT-COMPLETED',
    fileName: 'completed.vcf',
    fileSize: 512,
    speciesId: 'arabidopsis_thaliana',
    assemblyId: 'TAIR10',
    status: 'completed',
    pipelineMode: 'vcf_live',
    variants: [createVariant('VAR-2', 'MODERATE')],
    workbench: createWorkbench(),
    createdAt: '2026-03-15T11:00:00.000Z',
    updatedAt: '2026-03-15T11:00:00.000Z',
  })
  const failed = createAnalysisResult({
    id: 'PS-AT-FAILED',
    fileName: 'failed.vcf',
    fileSize: 512,
    speciesId: 'arabidopsis_thaliana',
    assemblyId: 'TAIR10',
    status: 'failed',
    pipelineMode: 'vcf_live',
    variants: [],
    workbench: null,
    createdAt: '2026-03-15T09:00:00.000Z',
    updatedAt: '2026-03-15T09:00:00.000Z',
    statusDetail: 'Annotation failed.',
  })

  for (const result of [queued, completed, failed]) {
    saveAnalysisResult(result)
  }

  const reports = listAnalyses()
  assert.deepEqual(
    reports.map((report) => report.id),
    ['PS-AT-COMPLETED', 'PS-AT-QUEUED', 'PS-AT-FAILED'],
  )
  assert.deepEqual(
    reports.map((report) => report.status),
    ['completed', 'queued', 'failed'],
  )
})

test('fetchCachedJson serves cached payload until TTL expires', async () => {
  process.env.PHYTOSCOPE_DATA_DIR = createTempDataDir()
  resetDatabaseForTests()

  let fetchCount = 0
  global.fetch = (async () => {
    fetchCount += 1
    return new Response(JSON.stringify({ fetchCount }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const first = await fetchCachedJson<{ fetchCount: number }>({
    source: 'europepmc',
    url: 'https://example.test/literature',
    ttlMs: 20,
  })
  const second = await fetchCachedJson<{ fetchCount: number }>({
    source: 'europepmc',
    url: 'https://example.test/literature',
    ttlMs: 20,
  })

  await new Promise((resolve) => setTimeout(resolve, 25))

  const third = await fetchCachedJson<{ fetchCount: number }>({
    source: 'europepmc',
    url: 'https://example.test/literature',
    ttlMs: 20,
  })

  assert.equal(first.observedVia, 'live')
  assert.equal(first.payload.fetchCount, 1)
  assert.equal(second.observedVia, 'cache')
  assert.equal(second.payload.fetchCount, 1)
  assert.equal(third.observedVia, 'live')
  assert.equal(third.payload.fetchCount, 2)
  assert.equal(fetchCount, 2)
})
