import { getSpeciesDefinition } from '@/lib/constants'
import { getAllMockVariants } from '@/lib/mockData'
import type {
  AnalysisSummary,
  AssemblyId,
  GeneProfile,
  OrthologyProfile,
  SpeciesId,
  UploadAnalysisResult,
  VariantAnnotation,
  VariantEffectType,
} from '@/types/genome'

const ENSEMBL_BASE_URL = 'https://rest.ensembl.org'
const MAX_ANNOTATED_VARIANTS = 16

interface OverlapFeature {
  id: string
  feature_type: 'gene' | 'transcript'
  seq_region_name: string
  start: number
  end: number
  strand: 1 | -1
  description?: string | null
  biotype?: string
  external_name?: string
  gene_id?: string
  transcript_id?: string
  canonical_transcript?: string
  Parent?: string
  assembly_name?: AssemblyId
  source?: string
}

interface EnsemblLookupResponse {
  id: string
  display_name?: string
  description?: string
  biotype?: string
  seq_region_name: string
  start: number
  end: number
  strand: 1 | -1
  assembly_name?: AssemblyId
}

interface EnsemblXref {
  id: string
  type: string
}

interface EnsemblHomologyResponse {
  data?: Array<{
    id: string
    homologies: Array<{
      type: string
      target: {
        id: string
        species: string
        perc_id?: number
      }
    }>
  }>
}

interface ParsedVcfRecord {
  id: string
  chromosome: string
  position: number
  reference: string
  alternate: string
  quality: number
  depth: number
}

export class VcfAnnotationInputError extends Error {}

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0

const normalizeChromosome = (value: string) =>
  value.replace(/^chr/i, '').replace(/^Mt$/i, 'M').replace(/^Pt$/i, 'C').toUpperCase()

const isLiteralAllele = (value: string) => /^[ACGTN]+$/i.test(value)

const safeFetchJson = async <T>(url: string) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Ensembl returned ${response.status}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

const parseInfoEntries = (value: string) =>
  value.split(';').reduce<Record<string, string>>((acc, entry) => {
    if (!entry) {
      return acc
    }

    const [key, fieldValue] = entry.split('=')
    if (key) {
      acc[key] = fieldValue ?? 'true'
    }

    return acc
  }, {})

const parseDepth = (
  infoEntries: Record<string, string>,
  format: string,
  sample: string,
) => {
  const infoDepth = Number(infoEntries.DP)
  if (Number.isFinite(infoDepth) && infoDepth > 0) {
    return Math.round(infoDepth)
  }

  if (format && sample) {
    const fields = format.split(':')
    const values = sample.split(':')
    const depthIndex = fields.findIndex((field) => field === 'DP')

    if (depthIndex >= 0) {
      const sampleDepth = Number(values[depthIndex])
      if (Number.isFinite(sampleDepth) && sampleDepth > 0) {
        return Math.round(sampleDepth)
      }
    }
  }

  return 28
}

export const parseVcfRecords = (content: string): ParsedVcfRecord[] => {
  const records: ParsedVcfRecord[] = []

  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) {
      continue
    }

    const [chromosome, position, id, reference, alternate, quality, , info, format = '', sample = ''] =
      line.split('\t')

    if (!chromosome || !position || !reference || !alternate) {
      continue
    }

    const parsedPosition = Number(position)
    if (!Number.isFinite(parsedPosition) || parsedPosition <= 0) {
      continue
    }

    const infoEntries = parseInfoEntries(info ?? '')
    const parsedQuality = Number(quality)
    const normalizedQuality =
      Number.isFinite(parsedQuality) && parsedQuality > 0
        ? Number(parsedQuality.toFixed(1))
        : 60
    const depth = parseDepth(infoEntries, format, sample)

    for (const allele of alternate.split(',')) {
      const normalizedAllele = allele.trim()
      if (!normalizedAllele || !isLiteralAllele(reference) || !isLiteralAllele(normalizedAllele)) {
        continue
      }

      records.push({
        id:
          id && id !== '.'
            ? id
            : `${normalizeChromosome(chromosome)}-${parsedPosition}-${reference}-${normalizedAllele}`,
        chromosome: normalizeChromosome(chromosome),
        position: parsedPosition,
        reference: reference.toUpperCase(),
        alternate: normalizedAllele.toUpperCase(),
        quality: normalizedQuality,
        depth,
      })
    }
  }

  return records
}

const getVariantType = (reference: string, alternate: string): VariantEffectType => {
  if (reference.length === 1 && alternate.length === 1) {
    return 'SNV'
  }

  if (reference.length === alternate.length) {
    return 'MNV'
  }

  return reference.length > alternate.length ? 'Deletion' : 'Insertion'
}

const inferImpact = (
  featureType: VariantAnnotation['featureType'],
  type: VariantEffectType,
  reference: string,
  alternate: string,
): VariantAnnotation['predictedImpact'] => {
  if (featureType === 'intergenic') {
    return 'MODIFIER'
  }

  if (type === 'Insertion' || type === 'Deletion') {
    return Math.abs(reference.length - alternate.length) % 3 === 0 ? 'MODERATE' : 'HIGH'
  }

  return type === 'MNV' ? 'MODERATE' : 'MODERATE'
}

const inferConsequences = (
  featureType: VariantAnnotation['featureType'],
  type: VariantEffectType,
  impact: VariantAnnotation['predictedImpact'],
) => {
  if (featureType === 'intergenic') {
    return ['intergenic_variant']
  }

  if (type === 'SNV') {
    return impact === 'HIGH' ? ['stop_gained'] : ['missense_variant']
  }

  if (type === 'MNV') {
    return ['coding_sequence_variant']
  }

  return impact === 'HIGH' ? ['frameshift_variant'] : ['inframe_indel']
}

const scoreVariant = (
  impact: VariantAnnotation['predictedImpact'],
  quality: number,
  depth: number,
) => {
  const weights = {
    HIGH: 3.2,
    MODERATE: 2.4,
    LOW: 1.3,
    MODIFIER: 0.8,
  } as const

  return Number((weights[impact] + quality / 60 + Math.min(depth, 120) / 80).toFixed(2))
}

const toGeneProfile = (
  gene: EnsemblLookupResponse,
  speciesId: SpeciesId,
): GeneProfile => ({
  id: gene.id,
  symbol: gene.display_name ?? gene.id,
  name: gene.description?.split(' [Source:')[0] ?? gene.display_name ?? gene.id,
  speciesId,
  assemblyId: gene.assembly_name ?? getSpeciesDefinition(speciesId).defaultAssemblyId,
  biotype: gene.biotype ?? 'gene',
  description: gene.description ?? 'No Ensembl description available.',
  aliases: [gene.display_name, gene.id].filter(Boolean) as string[],
  location: {
    chromosome: normalizeChromosome(gene.seq_region_name),
    start: gene.start,
    end: gene.end,
    strand: gene.strand,
  },
  sourceSummaries: [
    {
      source: 'ensembl',
      label: 'Ensembl Plants',
      description: 'Reference gene model retrieved from Ensembl Plants REST.',
      url: `https://plants.ensembl.org/${getSpeciesDefinition(speciesId).label.replace(' ', '_')}/Gene/Summary?g=${gene.id}`,
    },
  ],
  externalLinks: [
    {
      label: 'Ensembl gene page',
      source: 'Ensembl Plants',
      url: `https://plants.ensembl.org/${getSpeciesDefinition(speciesId).label.replace(' ', '_')}/Gene/Summary?g=${gene.id}`,
    },
  ],
  lastUpdated: new Date().toISOString().slice(0, 10),
})

export const resolveGeneIdFromSymbol = async (
  symbol: string,
  speciesId: SpeciesId,
) => {
  const items = await safeFetchJson<EnsemblXref[]>(
    `${ENSEMBL_BASE_URL}/xrefs/symbol/${speciesId}/${encodeURIComponent(symbol)}`,
  )

  return items.find((item) => item.type === 'gene')?.id ?? null
}

export const fetchGeneProfileFromEnsembl = async (
  geneId: string,
  speciesId: SpeciesId,
) => {
  const gene = await safeFetchJson<EnsemblLookupResponse>(
    `${ENSEMBL_BASE_URL}/lookup/id/${geneId}?expand=1`,
  )

  return toGeneProfile(gene, speciesId)
}

export const fetchGenesForRegion = async (
  regionLabel: string,
  speciesId: SpeciesId,
) => {
  const items = await safeFetchJson<OverlapFeature[]>(
    `${ENSEMBL_BASE_URL}/overlap/region/${speciesId}/${regionLabel}?feature=gene;feature=transcript`,
  )

  return items.filter((item) => item.feature_type === 'gene')
}

export const fetchOrthologues = async (
  geneId: string,
  speciesId: SpeciesId,
): Promise<OrthologyProfile[]> => {
  const response = await safeFetchJson<EnsemblHomologyResponse>(
    `${ENSEMBL_BASE_URL}/homology/id/${speciesId}/${geneId}?type=orthologues;sequence=none`,
  )

  return (response.data?.[0]?.homologies ?? [])
    .slice(0, 6)
    .map((item) => ({
      speciesLabel: item.target.species.replaceAll('_', ' '),
      geneId: item.target.id,
      geneLabel: item.target.id,
      relationship: item.type,
      source: 'Ensembl Plants',
      confidence: item.target.perc_id ? Number((item.target.perc_id / 100).toFixed(2)) : undefined,
      url: `https://plants.ensembl.org/Multi/Search/Results?q=${item.target.id}`,
    }))
}

export const annotatePlantVariant = async ({
  chromosome,
  position,
  reference,
  alternate,
  speciesId,
  quality = 60,
  depth = 28,
  id,
}: {
  chromosome: string
  position: number
  reference: string
  alternate: string
  speciesId: SpeciesId
  quality?: number
  depth?: number
  id?: string
}): Promise<VariantAnnotation> => {
  const normalizedChromosome = normalizeChromosome(chromosome)
  const items = await safeFetchJson<OverlapFeature[]>(
    `${ENSEMBL_BASE_URL}/overlap/region/${speciesId}/${normalizedChromosome}:${position}-${position}?feature=gene;feature=transcript`,
  )
  const gene = items.find((item) => item.feature_type === 'gene')
  const transcript = items.find((item) => item.feature_type === 'transcript')
  const type = getVariantType(reference, alternate)
  const featureType: VariantAnnotation['featureType'] = gene ? 'gene' : 'intergenic'
  const predictedImpact = inferImpact(featureType, type, reference, alternate)
  const consequenceTerms = inferConsequences(featureType, type, predictedImpact)

  return {
    id:
      id ??
      `${normalizedChromosome}-${position}-${reference}-${alternate}`,
    geneId: gene?.id ?? gene?.gene_id,
    geneSymbol: gene?.external_name ?? gene?.id ?? 'Intergenic',
    chromosome: normalizedChromosome,
    position,
    reference,
    alternate,
    type,
    predictedImpact,
    consequenceTerms,
    featureType,
    transcript: transcript?.transcript_id ?? transcript?.id ?? 'N/A',
    source: 'Ensembl overlap + plant heuristic',
    evidenceType: gene ? 'computational' : 'heuristic',
    quality,
    depth,
    score: scoreVariant(predictedImpact, quality, depth),
    lastUpdated: new Date().toISOString().slice(0, 10),
    notes: gene
      ? `Variant overlaps ${gene.external_name ?? gene.id} on ${speciesId}; impact is heuristic because plant VEP may be unavailable or slow.`
      : 'No overlapping gene was returned by Ensembl overlap; variant is treated as intergenic context.',
  }
}

const createSummary = ({
  id,
  fileName,
  fileSize,
  speciesId,
  assemblyId,
  variants,
}: {
  id: string
  fileName: string
  fileSize: number
  speciesId: SpeciesId
  assemblyId: AssemblyId
  variants: VariantAnnotation[]
}): AnalysisSummary => ({
  id,
  sampleId: id,
  fileName,
  format: 'VCF',
  speciesId,
  assemblyId,
  date: new Date().toISOString().slice(0, 10),
  status: 'completed',
  variantCount: variants.length,
  highImpactVariants: variants.filter((variant) => variant.predictedImpact === 'HIGH').length,
  meanDepth: Number(average(variants.map((variant) => variant.depth)).toFixed(1)),
  meanQuality: Number(average(variants.map((variant) => variant.quality)).toFixed(1)),
  fileSizeMb: Math.max(0.01, Number((fileSize / (1024 * 1024)).toFixed(2))),
  focusGene: variants[0]?.geneSymbol ?? 'N/A',
  insightCount: variants.length + 6,
})

export const supportsPlantAnnotation = (fileName: string) =>
  fileName.toLowerCase().endsWith('.vcf')

export const annotateVcfWithEnsembl = async (
  content: string,
  options: {
    fileName: string
    fileSize: number
    speciesId: SpeciesId
    assemblyId: AssemblyId
  },
): Promise<UploadAnalysisResult> => {
  const parsedRecords = parseVcfRecords(content)

  if (!parsedRecords.length) {
    throw new VcfAnnotationInputError(
      'VCF-файл не содержит поддерживаемых SNV/indel-вариантов для plant annotation.',
    )
  }

  const annotatedRecords = parsedRecords.slice(0, MAX_ANNOTATED_VARIANTS)
  const variants = await Promise.all(
    annotatedRecords.map((record) =>
      annotatePlantVariant({
        ...record,
        speciesId: options.speciesId,
      }).catch(
        (): VariantAnnotation => ({
          id: record.id,
          geneId: undefined,
          geneSymbol: 'Unresolved',
          chromosome: record.chromosome,
          position: record.position,
          reference: record.reference,
          alternate: record.alternate,
          type: getVariantType(record.reference, record.alternate),
          predictedImpact: 'MODIFIER',
          consequenceTerms: ['unresolved_variant'],
          featureType: 'locus',
          transcript: 'N/A',
          source: 'fallback heuristic',
          evidenceType: 'heuristic',
          quality: record.quality,
          depth: record.depth,
          score: scoreVariant('MODIFIER', record.quality, record.depth),
          lastUpdated: new Date().toISOString().slice(0, 10),
          notes:
            'Source lookup failed; fallback variant card was created to preserve upload flow.',
        }),
      ),
    ),
  )

  const analysisId = `PS-UP-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`

  return {
    summary: createSummary({
      id: analysisId,
      fileName: options.fileName,
      fileSize: options.fileSize,
      speciesId: options.speciesId,
      assemblyId: options.assemblyId,
      variants,
    }),
    variants,
    workbench: null,
  }
}

export const getLocalVariantContext = (geneId: string) =>
  getAllMockVariants().filter((variant) => variant.geneId === geneId)
