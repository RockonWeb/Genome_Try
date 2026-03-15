import assert from 'node:assert/strict'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { POST as uploadPost } from '@/app/api/analysis/upload/route'
import { GET as analysesGet } from '@/app/api/analyses/route'
import { GET as analysisByIdGet } from '@/app/api/analyses/[id]/route'
import { GET as literatureGet } from '@/app/api/literature/route'
import { GET as sourceStatusGet } from '@/app/api/source-status/route'
import { resetDatabaseForTests } from '@/lib/server/database'

const originalFetch = global.fetch

const createTempDataDir = () =>
  mkdtempSync(path.join(tmpdir(), 'phytoscope-routes-'))

const jsonResponse = (payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

const installExternalFetchMock = () => {
  global.fetch = (async (input) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (url.includes('/info/genomes/')) {
      return jsonResponse({ species: 'arabidopsis_thaliana' })
    }

    if (url.includes('/lookup/id/AT1G01010')) {
      return jsonResponse({
        id: 'AT1G01010',
        display_name: 'NAC001',
        description: 'Test lookup gene [Source:Ensembl]',
        biotype: 'protein_coding',
        seq_region_name: '1',
        start: 3631,
        end: 5899,
        strand: 1,
        assembly_name: 'TAIR10',
      })
    }

    if (url.includes('/homology/id/arabidopsis_thaliana/AT1G01010')) {
      return jsonResponse({
        data: [
          {
            id: 'AT1G01010',
            homologies: [
              {
                type: 'ortholog_one2one',
                target: {
                  id: 'Os01g0100100',
                  species: 'oryza_sativa',
                  perc_id: 71,
                },
              },
            ],
          },
        ],
      })
    }

    if (url.includes('/overlap/region/arabidopsis_thaliana/1:3631-3631')) {
      return jsonResponse([
        {
          id: 'AT1G01010',
          feature_type: 'gene',
          seq_region_name: '1',
          start: 3631,
          end: 5899,
          strand: 1,
          external_name: 'NAC001',
        },
        {
          id: 'AT1G01010.1',
          feature_type: 'transcript',
          seq_region_name: '1',
          start: 3631,
          end: 5899,
          strand: 1,
          transcript_id: 'AT1G01010.1',
        },
      ])
    }

    if (url.includes('bar.utoronto.ca/thalemine/service/search')) {
      return jsonResponse({
        results: [
          {
            fields: {
              primaryIdentifier: 'AT1G01010',
              symbol: 'NAC001',
              tairAliases: 'ANAC001,NTL10',
              tairCuratorSummary: 'Curated Arabidopsis summary',
            },
          },
        ],
      })
    }

    if (url.includes('gxa/json/bioentity-information/AT1G01010')) {
      return jsonResponse({
        bioentityProperties: [
          {
            type: 'po',
            values: [
              { text: 'leaf', url: 'https://example.test/leaf' },
              { text: 'root', url: 'https://example.test/root' },
            ],
          },
          {
            type: 'go',
            values: [
              {
                text: 'regulation of transcription',
                url: 'https://example.test/go1',
              },
            ],
          },
        ],
      })
    }

    if (url.includes('europepmc')) {
      return jsonResponse({
        resultList: {
          result: [
            {
              id: '1',
              title: 'High citation article',
              journalTitle: 'Plant Journal',
              pubYear: '2024',
              authorString: 'Author A, Author B',
              abstractText: 'Useful summary',
              citedByCount: 19,
              pmid: '123',
            },
            {
              id: '2',
              title: 'Newer lower citation article',
              journalTitle: 'Plant Cell',
              pubYear: '2025',
              authorString: 'Author C',
              abstractText: 'Another summary',
              citedByCount: 4,
              pmid: '456',
            },
            {
              id: '3',
              title: 'Old filtered article',
              journalTitle: 'Old Journal',
              pubYear: '2018',
              authorString: 'Author D',
              abstractText: 'Old summary',
              citedByCount: 200,
              pmid: '789',
            },
          ],
        },
      })
    }

    throw new Error(`Unexpected external URL in test: ${url}`)
  }) as typeof fetch
}

test.afterEach(() => {
  global.fetch = originalFetch
  resetDatabaseForTests()
  delete process.env.PHYTOSCOPE_DATA_DIR
})

test('POST /api/analysis/upload persists completed VCF runs and exposes them via analyses APIs', async () => {
  process.env.PHYTOSCOPE_DATA_DIR = createTempDataDir()
  resetDatabaseForTests()
  installExternalFetchMock()

  const formData = new FormData()
  formData.append(
    'file',
    new File(
      [
        [
          '##fileformat=VCFv4.2',
          '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE',
          '1\t3631\t.\tG\tA\t99\tPASS\tDP=42\tGT:DP\t0/1:42',
        ].join('\n'),
      ],
      'sample.vcf',
      { type: 'text/plain' },
    ),
  )
  formData.append('speciesId', 'arabidopsis_thaliana')
  formData.append('assemblyId', 'TAIR10')

  const uploadResponse = await uploadPost(
    new Request('http://localhost/api/analysis/upload', {
      method: 'POST',
      body: formData,
    }),
  )
  const uploadPayload = await uploadResponse.json()

  assert.equal(uploadResponse.status, 200)
  assert.equal(uploadPayload.summary.status, 'completed')
  assert.ok(uploadPayload.summary.storedFilePath)
  assert.ok(
    existsSync(
      path.resolve(process.cwd(), uploadPayload.summary.storedFilePath),
    ),
  )

  const analysesResponse = await analysesGet()
  const analysesPayload = await analysesResponse.json()
  assert.equal(analysesPayload.length, 1)
  assert.equal(analysesPayload[0].id, uploadPayload.summary.id)

  const analysisResponse = await analysisByIdGet(
    new Request('http://localhost'),
    {
      params: Promise.resolve({ id: uploadPayload.summary.id }),
    },
  )
  const analysisPayload = await analysisResponse.json()
  assert.equal(analysisPayload.summary.id, uploadPayload.summary.id)
  assert.equal(analysisPayload.workbench.gene.id, 'AT1G01010')
})

test('POST /api/analysis/upload creates queued non-VCF runs with saved files', async () => {
  process.env.PHYTOSCOPE_DATA_DIR = createTempDataDir()
  resetDatabaseForTests()
  installExternalFetchMock()

  const formData = new FormData()
  formData.append(
    'file',
    new File(['>seq\nATGC'], 'sample.fasta', { type: 'text/plain' }),
  )
  formData.append('speciesId', 'arabidopsis_thaliana')
  formData.append('assemblyId', 'TAIR10')

  const response = await uploadPost(
    new Request('http://localhost/api/analysis/upload', {
      method: 'POST',
      body: formData,
    }),
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.summary.status, 'queued')
  assert.equal(payload.summary.pipelineMode, 'deferred_backend')
  assert.equal(payload.workbench, null)
  assert.ok(
    existsSync(path.resolve(process.cwd(), payload.summary.storedFilePath)),
  )
})

test('GET /api/literature applies server-side filtering and sorting', async () => {
  process.env.PHYTOSCOPE_DATA_DIR = createTempDataDir()
  resetDatabaseForTests()
  installExternalFetchMock()

  const response = await literatureGet(
    new Request(
      'http://localhost/api/literature?q=AT1G01010&species=arabidopsis_thaliana&yearFrom=2022&sort=citations',
    ),
  )
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.query, 'AT1G01010')
  assert.equal(payload.items.length, 2)
  assert.equal(payload.items[0].title, 'High citation article')
  assert.equal(payload.items[1].title, 'Newer lower citation article')
})

test('GET /api/source-status returns cached health snapshots after the first refresh', async () => {
  process.env.PHYTOSCOPE_DATA_DIR = createTempDataDir()
  resetDatabaseForTests()
  installExternalFetchMock()

  const firstResponse = await sourceStatusGet(
    new Request(
      'http://localhost/api/source-status?species=arabidopsis_thaliana',
    ),
  )
  const firstPayload = await firstResponse.json()

  const secondResponse = await sourceStatusGet(
    new Request(
      'http://localhost/api/source-status?species=arabidopsis_thaliana',
    ),
  )
  const secondPayload = await secondResponse.json()

  assert.equal(firstResponse.status, 200)
  assert.equal(firstPayload.length, 5)
  assert.equal(firstPayload[0].observedVia, 'live')
  assert.equal(secondResponse.status, 200)
  assert.equal(secondPayload.length, 5)
  assert.ok(
    secondPayload.every(
      (status: { observedVia: string }) => status.observedVia === 'cache',
    ),
  )
})
