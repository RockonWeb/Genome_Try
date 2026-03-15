import { getSpeciesDefinition } from '@/lib/constants'
import type {
  AnalysisSummary,
  AssemblyId,
  GeneProfile,
  LiteratureCard,
  SourceStatus,
  SpeciesId,
  UploadAnalysisResult,
  VariantAnnotation,
  WorkbenchData,
} from '@/types/genome'

const now = '2026-03-15'

const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0

const sourceStatus = (): SourceStatus[] => [
  {
    source: 'ensembl',
    label: 'Ensembl Plants REST',
    status: 'online',
    coverage: 'full',
    detail: 'Lookup, overlap и orthology доступны.',
    lastChecked: now,
    observedVia: 'live',
  },
  {
    source: 'thalemine',
    label: 'BAR ThaleMine',
    status: 'online',
    coverage: 'partial',
    detail: 'Кураторское описание Arabidopsis и поиск доступны.',
    lastChecked: now,
    observedVia: 'live',
  },
  {
    source: 'expression-atlas',
    label: 'Expression Atlas',
    status: 'online',
    coverage: 'partial',
    detail: 'Bioentity-метаданные и ссылки на атлас доступны.',
    lastChecked: now,
    observedVia: 'live',
  },
  {
    source: 'europepmc',
    label: 'Europe PMC',
    status: 'online',
    coverage: 'full',
    detail: 'Карточки публикаций и число цитирований доступны.',
    lastChecked: now,
    observedVia: 'live',
  },
  {
    source: 'tair',
    label: 'TAIR',
    status: 'degraded',
    coverage: 'link-only',
    detail: 'Опциональный premium connector не активирован.',
    lastChecked: now,
    observedVia: 'live',
  },
]

type GeneSeed = {
  profile: GeneProfile
  expression: WorkbenchData['expression']
  regulation: WorkbenchData['regulation']
  functionTerms: WorkbenchData['functionTerms']
  interactions: WorkbenchData['interactions']
  orthology: WorkbenchData['orthology']
  literature: LiteratureCard[]
}

const geneCatalog: Record<string, GeneSeed> = {
  AT1G01010: {
    profile: {
      id: 'AT1G01010',
      symbol: 'NAC001',
      name: 'NAC domain containing protein 1',
      speciesId: 'arabidopsis_thaliana',
      assemblyId: 'TAIR10',
      biotype: 'protein_coding',
      description:
        'Представитель семейства NAC, связанный с мембраной и участвующий в стресс-ответе растений.',
      aliases: ['ANAC001', 'NTL10', 'AT1G01010'],
      location: { chromosome: '1', start: 3631, end: 5899, strand: 1 },
      sourceSummaries: [
        {
          source: 'thalemine',
          label: 'BAR ThaleMine',
          description:
            'Кураторское описание Arabidopsis подчёркивает транскрипционную регуляцию семейства NAC и связь с мембраной.',
        },
        {
          source: 'ensembl',
          label: 'Ensembl Plants',
          description:
            'Референсная модель гена на TAIR10 с каноническим транскриптом AT1G01010.1.',
        },
      ],
      externalLinks: [
        {
          label: 'Страница гена в Ensembl',
          source: 'Ensembl Plants',
          url: 'https://plants.ensembl.org/Arabidopsis_thaliana/Gene/Summary?g=AT1G01010',
        },
        {
          label: 'Страница в Expression Atlas',
          source: 'Expression Atlas',
          url: 'https://www.ebi.ac.uk/gxa/genes/AT1G01010?species=arabidopsis_thaliana',
        },
      ],
      lastUpdated: now,
    },
    expression: {
      summary:
        'Ген экспрессируется в листьях, корнях и цветочных тканях; данные атласа намекают на регуляцию, зависящую от условий стресса.',
      tissues: [
        {
          label: 'Leaf',
          value: 72,
          unit: 'relative',
          context: 'PO leaf structures',
          source: 'Expression Atlas',
        },
        {
          label: 'Root',
          value: 61,
          unit: 'relative',
          context: 'PO root',
          source: 'Expression Atlas',
        },
        {
          label: 'Flower',
          value: 48,
          unit: 'relative',
          context: 'PO flowering tissues',
          source: 'Expression Atlas',
        },
      ],
      conditions: [
        {
          label: 'Salt stress',
          value: 1.9,
          unit: 'log2 FC hint',
          context: 'stress-associated evidence card',
          source: 'Literature synthesis',
        },
        {
          label: 'Membrane release cues',
          value: 1.3,
          unit: 'relative hint',
          context: 'regulated TF activation',
          source: 'Curated synthesis',
        },
      ],
      source: 'Expression Atlas + curated synthesis',
      atlasLink:
        'https://www.ebi.ac.uk/gxa/genes/AT1G01010?species=arabidopsis_thaliana',
      lastUpdated: now,
    },
    regulation: [
      {
        title: 'Stress-responsive NAC regulator',
        summary:
          'Кураторские ресурсы по Arabidopsis и недавняя литература помещают NAC001/NTL10 в контекст стресс-ответной транскрипционной регуляции.',
        evidenceType: 'curated',
        source: 'BAR ThaleMine',
        tags: ['NAC family', 'transcription factor', 'stress'],
        score: 88,
      },
      {
        title: 'Membrane-associated activation logic',
        summary:
          'Аннотации GO и InterPro указывают на мембраносвязанный транскрипционный фактор с регулируемой ядерной активностью.',
        evidenceType: 'computational',
        source: 'Expression Atlas bioentity info',
        tags: ['membrane', 'nucleus', 'DNA binding'],
        score: 74,
      },
    ],
    functionTerms: [
      {
        id: 'GO:0006355',
        label: 'regulation of transcription, DNA-templated',
        category: 'BP',
        source: 'GO',
      },
      {
        id: 'GO:0000976',
        label: 'transcription regulatory region sequence-specific DNA binding',
        category: 'MF',
        source: 'GO',
      },
      { id: 'GO:0005634', label: 'nucleus', category: 'CC', source: 'GO' },
      {
        id: 'PO:0009005',
        label: 'root',
        category: 'PO',
        source: 'Plant Ontology',
      },
    ],
    interactions: [
      {
        partnerId: 'AT2G43010',
        partnerLabel: 'PIF4',
        relation: 'общий стрессовый и транскрипционный контекст развития',
        source: 'curated Arabidopsis synthesis',
        confidence: 0.67,
      },
      {
        partnerId: 'AT5G10140',
        partnerLabel: 'FLC',
        relation:
          'совместно упоминается в публикациях о регуляции цветения и стресс-ответе',
        source: 'literature synthesis',
        confidence: 0.48,
      },
    ],
    orthology: [
      {
        speciesLabel: 'Marchantia polymorpha',
        geneId: 'Mp4g22890',
        geneLabel: 'Mp4g22890',
        relationship: 'ortholog_one2many',
        source: 'Ensembl Plants',
        confidence: 0.19,
      },
      {
        speciesLabel: 'Physcomitrium patens',
        geneId: 'Pp3c16_23260',
        geneLabel: 'Pp3c16_23260',
        relationship: 'ortholog_one2many',
        source: 'Ensembl Plants',
        confidence: 0.2,
      },
    ],
    literature: [
      {
        id: 'PMID:34100001',
        title:
          'NAC membrane-associated regulators coordinate Arabidopsis stress acclimation',
        journal: 'Plant Physiology',
        year: 2022,
        authors: ['Lee J', 'Kumar R'],
        snippet:
          'Recent work connects membrane-tethered NAC regulators with rapid transcriptional rewiring during abiotic stress.',
        url: 'https://europepmc.org/search?query=AT1G01010%20Arabidopsis',
        source: 'Europe PMC',
        citedByCount: 27,
      },
    ],
  },
  AT2G43010: {
    profile: {
      id: 'AT2G43010',
      symbol: 'PIF4',
      name: 'phytochrome interacting factor 4',
      speciesId: 'arabidopsis_thaliana',
      assemblyId: 'TAIR10',
      biotype: 'protein_coding',
      description:
        'Ключевой интегратор сигналов температуры, света и роста с широкой ролью в транскрипционной регуляции.',
      aliases: ['PIF4', 'AT2G43010'],
      location: { chromosome: '2', start: 17927859, end: 17930420, strand: -1 },
      sourceSummaries: [
        {
          source: 'ensembl',
          label: 'Ensembl Plants',
          description:
            'Канонический ген Arabidopsis с хорошим покрытием в сравнительной геномике.',
        },
      ],
      externalLinks: [
        {
          label: 'Страница в Expression Atlas',
          source: 'Expression Atlas',
          url: 'https://www.ebi.ac.uk/gxa/genes/AT2G43010?species=arabidopsis_thaliana',
        },
      ],
      lastUpdated: now,
    },
    expression: {
      summary:
        'Высоко связан с программами ответа на свет и температуру, а также с динамической экспрессией при переходах развития.',
      tissues: [
        {
          label: 'Hypocotyl',
          value: 81,
          unit: 'relative',
          context: 'seedling growth',
          source: 'Curated synthesis',
        },
        {
          label: 'Leaf',
          value: 57,
          unit: 'relative',
          context: 'light response',
          source: 'Curated synthesis',
        },
      ],
      conditions: [
        {
          label: 'Warm temperature',
          value: 2.4,
          unit: 'log2 FC hint',
          context: 'thermomorphogenesis',
          source: 'Literature synthesis',
        },
      ],
      source: 'Curated synthesis',
      lastUpdated: now,
    },
    regulation: [
      {
        title: 'Thermomorphogenesis regulator',
        summary:
          'PIF4 находится в центре программ регуляции ответа на температуру и свет.',
        evidenceType: 'literature',
        source: 'Europe PMC',
        tags: ['light', 'temperature', 'growth'],
        score: 93,
      },
    ],
    functionTerms: [
      {
        id: 'GO:0006355',
        label: 'regulation of transcription, DNA-templated',
        category: 'BP',
        source: 'GO',
      },
      {
        id: 'GO:0003700',
        label: 'DNA-binding transcription factor activity',
        category: 'MF',
        source: 'GO',
      },
    ],
    interactions: [
      {
        partnerId: 'AT1G65480',
        partnerLabel: 'FT',
        relation: 'общий контекст перехода к цветению',
        source: 'Curated synthesis',
        confidence: 0.61,
      },
    ],
    orthology: [],
    literature: [
      {
        id: 'PMID:35620011',
        title:
          'PIF4 and environmental signal integration in Arabidopsis development',
        journal: 'Trends in Plant Science',
        year: 2023,
        authors: ['Martinez C'],
        snippet:
          'Review article synthesizing recent evidence for PIF4 as a hub connecting photoreceptor and thermosensory pathways.',
        url: 'https://europepmc.org/search?query=PIF4%20Arabidopsis',
        source: 'Europe PMC',
        citedByCount: 44,
      },
    ],
  },
}

const variantBlueprints: Array<
  Omit<VariantAnnotation, 'id' | 'score' | 'source' | 'lastUpdated'>
> = [
  {
    geneId: 'AT1G01010',
    geneSymbol: 'NAC001',
    chromosome: '1',
    position: 3714,
    reference: 'G',
    alternate: 'A',
    type: 'SNV',
    predictedImpact: 'MODERATE',
    consequenceTerms: ['missense_variant', 'DNA_binding_region'],
    featureType: 'gene',
    transcript: 'AT1G01010.1',
    evidenceType: 'curated',
    quality: 97.1,
    depth: 64,
    notes:
      'Located in NAC001 coding sequence; prioritize for expression/regulation follow-up in stress-associated experiments.',
  },
  {
    geneId: 'AT2G43010',
    geneSymbol: 'PIF4',
    chromosome: '2',
    position: 17929021,
    reference: 'C',
    alternate: 'T',
    type: 'SNV',
    predictedImpact: 'HIGH',
    consequenceTerms: ['stop_gained'],
    featureType: 'gene',
    transcript: 'AT2G43010.1',
    evidenceType: 'heuristic',
    quality: 92.7,
    depth: 71,
    notes:
      'High-priority coding consequence in a major developmental regulator; check supporting reads and phenotype concordance.',
  },
  {
    geneId: 'AT5G10140',
    geneSymbol: 'FLC',
    chromosome: '5',
    position: 3132500,
    reference: 'A',
    alternate: 'ATG',
    type: 'Insertion',
    predictedImpact: 'HIGH',
    consequenceTerms: ['frameshift_variant'],
    featureType: 'gene',
    transcript: 'AT5G10140.1',
    evidenceType: 'heuristic',
    quality: 91.4,
    depth: 58,
    notes:
      'Frameshift-like event within flowering-time regulator candidate; strong candidate for vernalization-related interpretation.',
  },
  {
    geneId: 'AT1G65480',
    geneSymbol: 'FT',
    chromosome: '1',
    position: 24389765,
    reference: 'T',
    alternate: 'C',
    type: 'SNV',
    predictedImpact: 'LOW',
    consequenceTerms: ['synonymous_variant'],
    featureType: 'gene',
    transcript: 'AT1G65480.1',
    evidenceType: 'curated',
    quality: 95.5,
    depth: 83,
    notes:
      'Synonymous change in FT; keep as contextual variant unless expression or splice evidence suggests otherwise.',
  },
  {
    geneId: 'AT3G24650',
    geneSymbol: 'ABI3',
    chromosome: '3',
    position: 8891078,
    reference: 'G',
    alternate: 'A',
    type: 'SNV',
    predictedImpact: 'MODERATE',
    consequenceTerms: ['missense_variant', 'seed_maturation_context'],
    featureType: 'gene',
    transcript: 'AT3G24650.1',
    evidenceType: 'curated',
    quality: 90.2,
    depth: 69,
    notes:
      'Candidate missense change in ABI3; relevant for seed maturation and dormancy follow-up.',
  },
  {
    geneId: 'AT4G18780',
    geneSymbol: 'RHD6',
    chromosome: '4',
    position: 10349233,
    reference: 'GA',
    alternate: 'G',
    type: 'Deletion',
    predictedImpact: 'MODERATE',
    consequenceTerms: ['inframe_deletion'],
    featureType: 'gene',
    transcript: 'AT4G18780.1',
    evidenceType: 'heuristic',
    quality: 88.8,
    depth: 61,
    notes:
      'Deletion within root-hair development candidate; useful when studying root system architecture.',
  },
]

const scoreVariant = (
  impact: VariantAnnotation['predictedImpact'],
  quality: number,
  depth: number,
) => {
  const weights = {
    HIGH: 3.2,
    MODERATE: 2.5,
    LOW: 1.4,
    MODIFIER: 0.8,
  } as const

  return Number(
    (weights[impact] + quality / 60 + Math.min(depth, 100) / 80).toFixed(2),
  )
}

const createVariantSet = (
  prefix: string,
  shift: number,
  qualityPenalty: number,
): VariantAnnotation[] =>
  variantBlueprints.map((variant, index) => {
    const quality = Number(
      Math.max(
        81,
        variant.quality - qualityPenalty + (index % 3) * 0.6,
      ).toFixed(1),
    )
    const depth = variant.depth + (index % 4) * 4

    return {
      ...variant,
      id: `${prefix}-V${String(index + 1).padStart(2, '0')}`,
      position: variant.position + shift + index * 7,
      quality,
      depth,
      score: scoreVariant(variant.predictedImpact, quality, depth),
      source: 'local research sandbox',
      lastUpdated: now,
    }
  })

const createSummary = ({
  id,
  sampleId,
  fileName,
  format,
  speciesId,
  assemblyId,
  date,
  status,
  fileSizeMb,
  variants,
}: {
  id: string
  sampleId: string
  fileName: string
  format: AnalysisSummary['format']
  speciesId: SpeciesId
  assemblyId: AssemblyId
  date: string
  status: AnalysisSummary['status']
  fileSizeMb: number
  variants: VariantAnnotation[]
}): AnalysisSummary => ({
  id,
  sampleId,
  fileName,
  format,
  speciesId,
  assemblyId,
  date,
  status,
  variantCount: variants.length,
  highImpactVariants: variants.filter(
    (variant) => variant.predictedImpact === 'HIGH',
  ).length,
  meanDepth: Number(
    average(variants.map((variant) => variant.depth)).toFixed(1),
  ),
  meanQuality: Number(
    average(variants.map((variant) => variant.quality)).toFixed(1),
  ),
  fileSizeMb,
  focusGene: variants[0]?.geneSymbol ?? 'N/A',
  insightCount: variants.length + 6,
  createdAt: `${date}T00:00:00.000Z`,
  updatedAt: `${date}T00:00:00.000Z`,
  statusDetail:
    status === 'processing'
      ? 'Демонстрационный запуск находится в обработке.'
      : null,
  pipelineMode: format === 'VCF' ? 'vcf_live' : 'deferred_backend',
  storedFilePath: null,
})

const analysisA = createVariantSet('PS-AT-4102', 0, 0)
const analysisB = createVariantSet('PS-AT-4094', 19, 1.8)
const analysisC = createVariantSet('PS-AT-4078', 37, 2.6)

export const getAllMockVariants = () =>
  [analysisA, analysisB, analysisC].flatMap((variants) => variants)

export const getMockWorkbench = (
  geneId: string,
  speciesId: SpeciesId = 'arabidopsis_thaliana',
): WorkbenchData => {
  const species = getSpeciesDefinition(speciesId)
  const gene = geneCatalog[geneId] ?? geneCatalog.AT1G01010
  const variants = getAllMockVariants().filter(
    (variant) => variant.geneId === gene.profile.id,
  )

  return {
    query: {
      raw: gene.profile.id,
      normalized: gene.profile.id,
      type: 'gene',
      speciesId,
      assemblyId: species.defaultAssemblyId,
      geneId: gene.profile.id,
      geneSymbol: gene.profile.symbol,
    },
    species,
    gene: gene.profile,
    locus: {
      chromosome: gene.profile.location.chromosome,
      start: gene.profile.location.start,
      end: gene.profile.location.end,
      regionLabel: `${gene.profile.location.chromosome}:${gene.profile.location.start}-${gene.profile.location.end}`,
      overlappingGeneIds: [gene.profile.id],
      source: 'mock catalog',
    },
    variants,
    expression: gene.expression,
    regulation: gene.regulation,
    functionTerms: gene.functionTerms,
    interactions: gene.interactions,
    orthology: gene.orthology,
    literature: gene.literature,
    supportingLinks: gene.profile.externalLinks,
    sourceStatus: sourceStatus(),
  }
}

export const mockReports: AnalysisSummary[] = [
  createSummary({
    id: 'PS-AT-4102',
    sampleId: 'PS-AT-4102',
    fileName: 'arabidopsis_stress_panel.vcf',
    format: 'VCF',
    speciesId: 'arabidopsis_thaliana',
    assemblyId: 'TAIR10',
    date: '2026-03-14',
    status: 'completed',
    fileSizeMb: 194,
    variants: analysisA,
  }),
  createSummary({
    id: 'PS-AT-4094',
    sampleId: 'PS-AT-4094',
    fileName: 'seed_dormancy_followup.bam',
    format: 'BAM',
    speciesId: 'arabidopsis_thaliana',
    assemblyId: 'TAIR10',
    date: '2026-03-12',
    status: 'completed',
    fileSizeMb: 812,
    variants: analysisB,
  }),
  createSummary({
    id: 'PS-AT-4089',
    sampleId: 'PS-AT-4089',
    fileName: 'root_architecture_targets.bed',
    format: 'BED',
    speciesId: 'arabidopsis_thaliana',
    assemblyId: 'TAIR10',
    date: '2026-03-11',
    status: 'processing',
    fileSizeMb: 38,
    variants: [],
  }),
  createSummary({
    id: 'PS-AT-4078',
    sampleId: 'PS-AT-4078',
    fileName: 'cross_species_baseline.fasta',
    format: 'FASTA',
    speciesId: 'oryza_sativa',
    assemblyId: 'IRGSP-1.0',
    date: '2026-03-07',
    status: 'completed',
    fileSizeMb: 1260,
    variants: analysisC,
  }),
]

export const mockAnalysesById: Record<string, UploadAnalysisResult> = {
  'PS-AT-4102': {
    summary: mockReports[0],
    variants: analysisA,
    workbench: getMockWorkbench('AT1G01010'),
  },
  'PS-AT-4094': {
    summary: mockReports[1],
    variants: analysisB,
    workbench: getMockWorkbench('AT2G43010'),
  },
  'PS-AT-4078': {
    summary: mockReports[3],
    variants: analysisC,
    workbench: getMockWorkbench('AT1G01010', 'oryza_sativa'),
  },
}

export const getMockGeneProfile = (geneId: string): GeneProfile | null =>
  geneCatalog[geneId]?.profile ?? null

const getFormatFromFileName = (fileName: string): AnalysisSummary['format'] => {
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()

  switch (extension) {
    case '.vcf':
      return 'VCF'
    case '.bam':
      return 'BAM'
    case '.bed':
      return 'BED'
    default:
      return 'FASTA'
  }
}

export const createUploadedAnalysis = (
  file: File,
  speciesId: SpeciesId,
  assemblyId: AssemblyId,
): UploadAnalysisResult => {
  const seed = Array.from(file.name).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  )
  const id = `PS-${speciesId === 'arabidopsis_thaliana' ? 'AT' : 'PL'}-${String(Date.now()).slice(-4)}`
  const variants = createVariantSet(id, seed % 90, (seed % 5) * 0.6)
  const focusGene = variants[seed % variants.length]?.geneId ?? 'AT1G01010'
  const fileSizeMb = Math.max(12, Math.round(file.size / (1024 * 1024)) || 96)

  return {
    summary: createSummary({
      id,
      sampleId: id,
      fileName: file.name,
      format: getFormatFromFileName(file.name),
      speciesId,
      assemblyId,
      date: now,
      status: 'completed',
      fileSizeMb,
      variants,
    }),
    variants,
    workbench: getMockWorkbench(focusGene, speciesId),
  }
}
