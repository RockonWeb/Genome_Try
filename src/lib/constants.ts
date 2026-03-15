import type {
  ClinicalSignificance,
  GenomeBuildId,
  MutationType,
} from '@/types/genome'

export const APP_CONFIG = {
  name: 'GenomeScope',
  version: '0.1.0',
  description:
    'Демо-платформа для загрузки, анализа и визуализации геномных данных.',
  supportEmail: 'support@genomescope.ai',
} as const

export const SAMPLE_REPORT_ID = 'GS-7721'

export const SUPPORTED_FORMATS = [
  {
    extension: '.vcf',
    label: 'VCF',
    description: 'Variant Call Format для вариантов и клинической интерпретации',
  },
  {
    extension: '.fasta',
    label: 'FASTA',
    description: 'Нуклеотидные последовательности для первичного анализа',
  },
  {
    extension: '.bam',
    label: 'BAM',
    description: 'Выравнивания прочтений для оценки покрытия и качества',
  },
  {
    extension: '.bed',
    label: 'BED',
    description: 'Геномные интервалы и таргетные панели',
  },
] as const

export const GENOME_BUILDS: Array<{
  id: GenomeBuildId
  name: string
  description: string
}> = [
  {
    id: 'hg38',
    name: 'GRCh38 (hg38)',
    description: 'Основная клиническая сборка для современных пайплайнов.',
  },
  {
    id: 'hg19',
    name: 'GRCh37 (hg19)',
    description: 'Наследуемые проекты и архивные панели без миграции.',
  },
  {
    id: 't2t',
    name: 'T2T-CHM13',
    description: 'Полная telomere-to-telomere сборка для исследовательских сценариев.',
  },
]

export const MUTATION_TYPE_OPTIONS: Array<{
  id: MutationType | 'all'
  label: string
}> = [
  { id: 'all', label: 'Все типы' },
  { id: 'SNV', label: 'SNV' },
  { id: 'Insertion', label: 'Insertion' },
  { id: 'Deletion', label: 'Deletion' },
  { id: 'CNV', label: 'CNV' },
]

export const CLINICAL_SIGNIFICANCE_OPTIONS: Array<{
  id: ClinicalSignificance | 'all'
  label: string
}> = [
  { id: 'all', label: 'Любая значимость' },
  { id: 'Pathogenic', label: 'Pathogenic' },
  { id: 'Likely Pathogenic', label: 'Likely Pathogenic' },
  { id: 'VUS', label: 'VUS' },
  { id: 'Likely Benign', label: 'Likely Benign' },
  { id: 'Benign', label: 'Benign' },
]

export const STATUS_LABELS = {
  processing: 'В обработке',
  completed: 'Завершён',
  failed: 'С ошибкой',
} as const
