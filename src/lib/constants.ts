import type {
  PredictedImpact,
  SpeciesDefinition,
  SpeciesId,
  SupportedFormat,
  VariantEffectType,
} from '@/types/genome'

export const APP_CONFIG = {
  name: 'PhytoScope',
  version: '1.0.0',
  description:
    'Платформа для исследований в области геномики растений: варианты, функции генов, регуляция, экспрессия и литература.',
  supportEmail: 'research@phytoscope.ai',
} as const

export const SAMPLE_REPORT_ID = 'PS-AT-4102'

export const SUPPORTED_FORMATS: Array<{
  extension: `.${Lowercase<SupportedFormat>}`
  label: SupportedFormat
  description: string
}> = [
  {
    extension: '.vcf',
    label: 'VCF',
    description:
      'Варианты для plant-aware аннотации с последствиями, генами и исследовательским контекстом.',
  },
  {
    extension: '.fasta',
    label: 'FASTA',
    description:
      'Последовательности для сборки контекста, локусов и downstream анализа.',
  },
  {
    extension: '.bam',
    label: 'BAM',
    description:
      'Выравнивания прочтений для оценки покрытия, поддержки вариантов и QC.',
  },
  {
    extension: '.bed',
    label: 'BED',
    description:
      'Геномные интервалы для candidate loci, targets и сопоставления с генами.',
  },
]

export const SPECIES_OPTIONS: SpeciesDefinition[] = [
  {
    id: 'arabidopsis_thaliana',
    label: 'Arabidopsis thaliana',
    commonName: 'резушка Таля',
    taxonId: 3702,
    defaultAssemblyId: 'TAIR10',
    assemblies: [
      {
        id: 'TAIR10',
        name: 'TAIR10',
        description:
          'Базовая референсная сборка для сценариев с приоритетом Arabidopsis.',
      },
    ],
    capabilities: {
      arabidopsisDepth: true,
      expression: 'full',
      regulation: 'full',
      literature: 'full',
    },
  },
  {
    id: 'oryza_sativa',
    label: 'Oryza sativa',
    commonName: 'рис',
    taxonId: 4530,
    defaultAssemblyId: 'IRGSP-1.0',
    assemblies: [
      {
        id: 'IRGSP-1.0',
        name: 'IRGSP-1.0',
        description:
          'Базовая референсная сборка риса для межвидовых исследований.',
      },
    ],
    capabilities: {
      arabidopsisDepth: false,
      expression: 'baseline',
      regulation: 'baseline',
      literature: 'baseline',
    },
  },
  {
    id: 'zea_mays',
    label: 'Zea mays',
    commonName: 'кукуруза',
    taxonId: 4577,
    defaultAssemblyId: 'AGPv4',
    assemblies: [
      {
        id: 'AGPv4',
        name: 'AGPv4',
        description:
          'Базовая референсная сборка кукурузы для сравнительной геномики растений.',
      },
    ],
    capabilities: {
      arabidopsisDepth: false,
      expression: 'baseline',
      regulation: 'baseline',
      literature: 'baseline',
    },
  },
  {
    id: 'glycine_max',
    label: 'Glycine max',
    commonName: 'соя',
    taxonId: 3847,
    defaultAssemblyId: 'Wm82.a4.v1',
    assemblies: [
      {
        id: 'Wm82.a4.v1',
        name: 'Wm82.a4.v1',
        description: 'Референсная сборка сои для базовой межвидовой поддержки.',
      },
    ],
    capabilities: {
      arabidopsisDepth: false,
      expression: 'baseline',
      regulation: 'baseline',
      literature: 'baseline',
    },
  },
]

export const DEFAULT_SPECIES_ID: SpeciesId = 'arabidopsis_thaliana'

export const getSpeciesDefinition = (speciesId: SpeciesId) =>
  SPECIES_OPTIONS.find((species) => species.id === speciesId) ??
  SPECIES_OPTIONS[0]

export const VARIANT_TYPE_OPTIONS: Array<{
  id: VariantEffectType | 'all'
  label: string
}> = [
  { id: 'all', label: 'Все типы' },
  { id: 'SNV', label: 'SNV' },
  { id: 'Insertion', label: 'Insertion' },
  { id: 'Deletion', label: 'Deletion' },
  { id: 'MNV', label: 'MNV' },
]

export const IMPACT_OPTIONS: Array<{
  id: PredictedImpact | 'all'
  label: string
}> = [
  { id: 'all', label: 'Любой impact' },
  { id: 'HIGH', label: 'HIGH' },
  { id: 'MODERATE', label: 'MODERATE' },
  { id: 'LOW', label: 'LOW' },
  { id: 'MODIFIER', label: 'MODIFIER' },
]

export const STATUS_LABELS = {
  queued: 'В очереди',
  processing: 'В обработке',
  completed: 'Завершён',
  failed: 'С ошибкой',
} as const

export const SAMPLE_QUERIES = [
  'AT1G01010',
  'NAC001',
  '1:3631-5899',
  '1:3631 G>A',
  'AT2G43010',
]

export const SOURCE_CATALOG = [
  {
    source: 'ensembl',
    label: 'Ensembl Plants REST',
    url: 'https://rest.ensembl.org/',
  },
  {
    source: 'thalemine',
    label: 'BAR ThaleMine',
    url: 'https://bar.utoronto.ca/thalemine/begin.do',
  },
  {
    source: 'expression-atlas',
    label: 'Expression Atlas',
    url: 'https://www.ebi.ac.uk/gxa/home',
  },
  {
    source: 'europepmc',
    label: 'Europe PMC',
    url: 'https://europepmc.org/',
  },
  {
    source: 'tair',
    label: 'TAIR',
    url: 'https://phoenixbioinfo.org/tair/',
  },
]
