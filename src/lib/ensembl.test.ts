import test from 'node:test'
import assert from 'node:assert/strict'
import { annotatePlantVariant, parseVcfRecords } from '@/lib/ensembl'

test('parseVcfRecords extracts plant-friendly records', () => {
  const records = parseVcfRecords(
    [
      '##fileformat=VCFv4.2',
      '#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE',
      '1\t3631\t.\tG\tA\t99\tPASS\tDP=42\tGT:DP\t0/1:42',
    ].join('\n'),
  )

  assert.equal(records.length, 1)
  assert.equal(records[0].chromosome, '1')
  assert.equal(records[0].depth, 42)
})

test('annotatePlantVariant maps overlap payload to a gene-centered card', async () => {
  const originalFetch = global.fetch

  global.fetch = (async () =>
    new Response(
      JSON.stringify([
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
      ]),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )) as typeof fetch

  try {
    const variant = await annotatePlantVariant({
      chromosome: '1',
      position: 3714,
      reference: 'G',
      alternate: 'A',
      speciesId: 'arabidopsis_thaliana',
      quality: 90,
      depth: 35,
    })

    assert.equal(variant.geneId, 'AT1G01010')
    assert.equal(variant.geneSymbol, 'NAC001')
    assert.equal(variant.featureType, 'gene')
    assert.equal(variant.predictedImpact, 'MODERATE')
    assert.equal(variant.transcript, 'AT1G01010.1')
  } finally {
    global.fetch = originalFetch
  }
})
