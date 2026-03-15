import test from 'node:test'
import assert from 'node:assert/strict'
import { parseResearchQuery } from '@/lib/query'

test('parseResearchQuery resolves AGI IDs', () => {
  const parsed = parseResearchQuery('AT1G01010', 'arabidopsis_thaliana')

  assert.equal(parsed.type, 'gene')
  assert.equal(parsed.geneId, 'AT1G01010')
  assert.equal(parsed.assemblyId, 'TAIR10')
})

test('parseResearchQuery resolves loci', () => {
  const parsed = parseResearchQuery('1:3631-5899', 'arabidopsis_thaliana')

  assert.equal(parsed.type, 'locus')
  assert.equal(parsed.locus?.chromosome, '1')
  assert.equal(parsed.locus?.start, 3631)
  assert.equal(parsed.locus?.end, 5899)
})

test('parseResearchQuery resolves simple variant notation', () => {
  const parsed = parseResearchQuery('1:3631 G>A', 'arabidopsis_thaliana')

  assert.equal(parsed.type, 'variant')
  assert.equal(parsed.variantLabel, '1:3631 G>A')
})

test('parseResearchQuery falls back to symbol mode', () => {
  const parsed = parseResearchQuery('NAC001', 'arabidopsis_thaliana')

  assert.equal(parsed.type, 'symbol')
  assert.equal(parsed.geneSymbol, 'NAC001')
})
