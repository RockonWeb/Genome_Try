import type {
  AnalysisSummary,
  ClinicalSignificance,
  GenomeBuildId,
  GenomeVariant,
  MutationType,
  UploadAnalysisResult,
  VariantImpact,
} from '@/types/genome'

const ENSEMBL_BASE_URL: Record<Exclude<GenomeBuildId, 't2t'>, string> = {
  hg38: 'https://rest.ensembl.org',
  hg19: 'https://grch37.rest.ensembl.org',
}

const SUPPORTED_CHROMOSOMES = new Set([
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  'X',
  'Y',
  'MT',
])

const MAX_ANNOTATED_VARIANTS = 24
const ENSEMBL_BATCH_SIZE = 12

interface ParsedVcfRecord {
  id: string
  chromosome: string
  position: number
  reference: string
  alternate: string
  quality: number
  depth: number
  rawInput: string
}

interface EnsemblFrequencyMap {
  [population: string]: number
}

interface EnsemblColocatedVariant {
  id?: string
  clin_sig?: string[]
  frequencies?: Record<string, EnsemblFrequencyMap>
}

interface EnsemblTranscriptConsequence {
  gene_symbol?: string
  transcript_id?: string
  mane_select?: string
  impact?: string
  hgvsc?: string
  hgvsp?: string
}

interface EnsemblVepResponse {
  input: string
  seq_region_name: string
  start: number
  end: number
  variant_class?: string
  most_severe_consequence?: string
  transcript_consequences?: EnsemblTranscriptConsequence[]
  colocated_variants?: EnsemblColocatedVariant[]
}

interface AnnotateVcfOptions {
  fileName: string
  fileSize: number
  genomeBuild: GenomeBuildId
}

export class VcfAnnotationInputError extends Error {}

const average = (values: number[]) => {
  if (!values.length) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const normalizeChromosome = (value: string) => {
  const normalized = value.replace(/^chr/i, '').toUpperCase()

  if (normalized === 'M') {
    return 'MT'
  }

  return normalized
}

const isLiteralAllele = (value: string) => /^[ACGTN]+$/i.test(value)

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

  return 32
}

const parseVcfRecords = (content: string): ParsedVcfRecord[] => {
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

    const normalizedChromosome = normalizeChromosome(chromosome)
    if (!SUPPORTED_CHROMOSOMES.has(normalizedChromosome)) {
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
        id: id && id !== '.' ? id : `${normalizedChromosome}-${parsedPosition}-${reference}-${normalizedAllele}`,
        chromosome: normalizedChromosome,
        position: parsedPosition,
        reference,
        alternate: normalizedAllele,
        quality: normalizedQuality,
        depth,
        rawInput: `${normalizedChromosome} ${parsedPosition} . ${reference} ${normalizedAllele} . . .`,
      })
    }
  }

  return records
}

const getEnsemblBaseUrl = (genomeBuild: GenomeBuildId) =>
  genomeBuild === 't2t' ? null : ENSEMBL_BASE_URL[genomeBuild]

const toImpact = (value?: string): VariantImpact => {
  if (value === 'HIGH') {
    return 'High'
  }

  if (value === 'MODERATE') {
    return 'Moderate'
  }

  return 'Low'
}

const toClinicalSignificance = (variants: EnsemblColocatedVariant[] = []): ClinicalSignificance => {
  const flags = new Set(
    variants.flatMap((variant) => variant.clin_sig ?? []).map((item) => item.toLowerCase()),
  )

  if (flags.has('pathogenic')) {
    return 'Pathogenic'
  }

  if (flags.has('likely_pathogenic')) {
    return 'Likely Pathogenic'
  }

  if (flags.has('benign')) {
    return 'Benign'
  }

  if (flags.has('likely_benign')) {
    return 'Likely Benign'
  }

  if (flags.has('uncertain_significance')) {
    return 'VUS'
  }

  return 'VUS'
}

const toMutationType = (
  record: ParsedVcfRecord,
  variantClass?: string,
): MutationType => {
  const normalizedClass = variantClass?.toLowerCase()

  if (normalizedClass?.includes('deletion')) {
    return 'Deletion'
  }

  if (normalizedClass?.includes('insertion')) {
    return 'Insertion'
  }

  if (record.reference.length === 1 && record.alternate.length === 1) {
    return 'SNV'
  }

  if (record.reference.length > record.alternate.length) {
    return 'Deletion'
  }

  if (record.reference.length < record.alternate.length) {
    return 'Insertion'
  }

  return 'CNV'
}

const getColocatedVariant = (annotation?: EnsemblVepResponse) =>
  annotation?.colocated_variants?.find((variant) => variant.clin_sig?.length) ??
  annotation?.colocated_variants?.find((variant) => variant.id) ??
  null

const getAlleleFrequency = (
  colocatedVariant: EnsemblColocatedVariant | null,
  alternate: string,
) => {
  if (!colocatedVariant?.frequencies?.[alternate]) {
    return null
  }

  const frequencyValues = Object.values(colocatedVariant.frequencies[alternate]).filter(
    (value) => Number.isFinite(value),
  )

  if (!frequencyValues.length) {
    return null
  }

  return Math.max(...frequencyValues)
}

const buildPriorityScore = ({
  impact,
  clinicalSignificance,
  quality,
  depth,
  alleleFrequency,
}: {
  impact: VariantImpact
  clinicalSignificance: ClinicalSignificance
  quality: number
  depth: number
  alleleFrequency: number | null
}) => {
  const impactWeight = {
    High: 3.4,
    Moderate: 2.6,
    Low: 1.8,
  } satisfies Record<VariantImpact, number>

  const significanceWeight = {
    Pathogenic: 3,
    'Likely Pathogenic': 2.5,
    VUS: 1.7,
    'Likely Benign': 1.1,
    Benign: 0.8,
  } satisfies Record<ClinicalSignificance, number>

  const qualityWeight = Math.min(quality, 99) / 45
  const depthWeight = Math.min(depth, 120) / 90
  const rarityWeight =
    alleleFrequency === null
      ? 0.8
      : Math.max(0.2, Math.min(2.2, -Math.log10(Math.max(alleleFrequency, 1e-9)) / 2))

  const exponent =
    impactWeight[impact] +
    significanceWeight[clinicalSignificance] +
    qualityWeight +
    depthWeight +
    rarityWeight

  return Number(Math.pow(10, -exponent).toExponential(2))
}

const formatConsequence = (value?: string) =>
  value ? value.replace(/_/g, ' ') : 'variant of unknown consequence'

const buildNotes = ({
  gene,
  transcript,
  consequence,
  colocatedVariant,
  annotation,
}: {
  gene: string
  transcript: string
  consequence?: string
  colocatedVariant: EnsemblColocatedVariant | null
  annotation?: EnsemblVepResponse
}) => {
  const fragments = [
    `Ensembl VEP аннотировал вариант в гене ${gene}.`,
    `Наиболее тяжёлое следствие: ${formatConsequence(consequence)}.`,
    transcript !== 'N/A' ? `Основной транскрипт: ${transcript}.` : null,
    annotation?.transcript_consequences?.[0]?.hgvsc
      ? `HGVS(c): ${annotation.transcript_consequences[0].hgvsc}.`
      : null,
    annotation?.transcript_consequences?.[0]?.hgvsp
      ? `HGVS(p): ${annotation.transcript_consequences[0].hgvsp}.`
      : null,
    colocatedVariant?.id ? `Публичный идентификатор: ${colocatedVariant.id}.` : null,
  ]

  return fragments.filter(Boolean).join(' ')
}

const buildVariant = (
  record: ParsedVcfRecord,
  annotation: EnsemblVepResponse | undefined,
  index: number,
): GenomeVariant => {
  const transcript = annotation?.transcript_consequences?.[0]
  const colocatedVariant = getColocatedVariant(annotation)
  const gene = transcript?.gene_symbol ?? 'Unresolved'
  const impact = toImpact(transcript?.impact)
  const clinicalSignificance = toClinicalSignificance(annotation?.colocated_variants)
  const alleleFrequency = getAlleleFrequency(colocatedVariant, record.alternate)
  const resolvedId =
    record.id && record.id !== '.'
      ? record.id
      : colocatedVariant?.id ?? `annotated-${index + 1}`

  return {
    id: resolvedId,
    gene,
    chromosome: `chr${annotation?.seq_region_name ?? record.chromosome}`,
    position: annotation?.start ?? record.position,
    reference: record.reference,
    alternate: record.alternate,
    type: toMutationType(record, annotation?.variant_class),
    impact,
    quality: record.quality,
    clinicalSignificance,
    depth: record.depth,
    pValue: buildPriorityScore({
      impact,
      clinicalSignificance,
      quality: record.quality,
      depth: record.depth,
      alleleFrequency,
    }),
    transcript: transcript?.mane_select ?? transcript?.transcript_id ?? 'N/A',
    notes: buildNotes({
      gene,
      transcript: transcript?.mane_select ?? transcript?.transcript_id ?? 'N/A',
      consequence: annotation?.most_severe_consequence,
      colocatedVariant,
      annotation,
    }),
  }
}

const createAnalysisSummary = ({
  id,
  fileName,
  fileSize,
  genomeBuild,
  variantCount,
  variants,
}: {
  id: string
  fileName: string
  fileSize: number
  genomeBuild: GenomeBuildId
  variantCount: number
  variants: GenomeVariant[]
}): AnalysisSummary => ({
  id,
  sampleId: id,
  fileName,
  format: 'VCF',
  genomeBuild,
  date: new Date().toISOString().slice(0, 10),
  status: 'completed',
  variantCount,
  highImpactVariants: variants.filter((variant) => variant.impact === 'High').length,
  pathogenicVariants: variants.filter((variant) =>
    ['Pathogenic', 'Likely Pathogenic'].includes(variant.clinicalSignificance),
  ).length,
  coverage: Number(average(variants.map((variant) => variant.depth)).toFixed(1)),
  meanQuality: Number(average(variants.map((variant) => variant.quality)).toFixed(1)),
  fileSizeMb: Math.max(0.01, Number((fileSize / (1024 * 1024)).toFixed(2))),
})

const fetchEnsemblBatch = async (
  records: ParsedVcfRecord[],
  genomeBuild: GenomeBuildId,
) => {
  const baseUrl = getEnsemblBaseUrl(genomeBuild)
  if (!baseUrl) {
    throw new Error('Genome build is not supported by Ensembl REST')
  }

  const response = await fetch(
    `${baseUrl}/vep/homo_sapiens/region?hgvs=1&variant_class=1&mane=1&pick=1`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variants: records.map((record) => record.rawInput),
      }),
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    throw new Error(`Ensembl REST returned ${response.status}`)
  }

  return (await response.json()) as EnsemblVepResponse[]
}

export const supportsEnsemblAnnotation = (
  fileName: string,
  genomeBuild: GenomeBuildId,
) => fileName.toLowerCase().endsWith('.vcf') && genomeBuild !== 't2t'

export const annotateVcfWithEnsembl = async (
  content: string,
  options: AnnotateVcfOptions,
): Promise<UploadAnalysisResult> => {
  const parsedRecords = parseVcfRecords(content)

  if (!parsedRecords.length) {
    throw new VcfAnnotationInputError(
      'VCF-файл не содержит поддерживаемых SNV/indel-вариантов для аннотации.',
    )
  }

  const annotatedRecords = parsedRecords.slice(0, MAX_ANNOTATED_VARIANTS)
  const annotations: EnsemblVepResponse[] = []

  for (let index = 0; index < annotatedRecords.length; index += ENSEMBL_BATCH_SIZE) {
    const batch = annotatedRecords.slice(index, index + ENSEMBL_BATCH_SIZE)
    annotations.push(...(await fetchEnsemblBatch(batch, options.genomeBuild)))
  }

  const annotationMap = new Map(
    annotations.map((annotation) => [annotation.input, annotation]),
  )
  const analysisId = `GS-${crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`
  const variants = annotatedRecords.map((record, index) =>
    buildVariant(record, annotationMap.get(record.rawInput), index),
  )

  return {
    summary: createAnalysisSummary({
      id: analysisId,
      fileName: options.fileName,
      fileSize: options.fileSize,
      genomeBuild: options.genomeBuild,
      variantCount: parsedRecords.length,
      variants,
    }),
    variants,
  }
}
