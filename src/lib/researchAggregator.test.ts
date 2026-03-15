import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { buildWorkbenchFromQuery } from '@/lib/researchAggregator'
import { resetDatabaseForTests } from '@/lib/server/database'

const originalFetch = global.fetch

test.afterEach(() => {
  global.fetch = originalFetch
  resetDatabaseForTests()
  delete process.env.PHYTOSCOPE_DATA_DIR
})

test('buildWorkbenchFromQuery returns empty degraded workbench instead of mock fallback on source failure', async () => {
  process.env.PHYTOSCOPE_DATA_DIR = mkdtempSync(
    path.join(tmpdir(), 'phytoscope-aggregator-'),
  )
  resetDatabaseForTests()

  global.fetch = (async () => {
    throw new Error('network unavailable')
  }) as typeof fetch

  const workbench = await buildWorkbenchFromQuery(
    'AT1G01010',
    'arabidopsis_thaliana',
  )

  assert.equal(workbench.query.normalized, 'AT1G01010')
  assert.equal(workbench.gene, null)
  assert.equal(workbench.variants.length, 0)
  assert.ok(workbench.sourceStatus.length <= 5)
})
