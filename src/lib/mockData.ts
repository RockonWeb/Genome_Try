import type {
  AnalysisSummary,
  ClinicalSignificance,
  GenomeBuildId,
  GenomeVariant,
  SupportedFormat,
  UploadAnalysisResult,
} from '@/types/genome'

const pathogenicSet = new Set<ClinicalSignificance>([
  'Pathogenic',
  'Likely Pathogenic',
])

const variantBlueprints: Array<Omit<GenomeVariant, 'id'>> = [
  {
    gene: 'BRCA1',
    chromosome: 'chr17',
    position: 43071077,
    reference: 'A',
    alternate: 'G',
    type: 'SNV',
    impact: 'High',
    quality: 99.4,
    clinicalSignificance: 'Pathogenic',
    depth: 118,
    pValue: 8.1e-9,
    transcript: 'NM_007294.4',
    notes: 'Вариант связан с повышенным риском наследственного рака молочной железы.',
  },
  {
    gene: 'CFTR',
    chromosome: 'chr7',
    position: 117559593,
    reference: 'T',
    alternate: 'C',
    type: 'SNV',
    impact: 'Moderate',
    quality: 96.7,
    clinicalSignificance: 'Likely Pathogenic',
    depth: 96,
    pValue: 2.3e-8,
    transcript: 'NM_000492.4',
    notes: 'Требует сопоставления с фенотипом и панелью наследственных заболеваний.',
  },
  {
    gene: 'TP53',
    chromosome: 'chr17',
    position: 7673803,
    reference: 'G',
    alternate: 'A',
    type: 'SNV',
    impact: 'High',
    quality: 98.1,
    clinicalSignificance: 'Pathogenic',
    depth: 142,
    pValue: 1.1e-7,
    transcript: 'NM_000546.6',
    notes: 'Нужна проверка соматического или герминального происхождения.',
  },
  {
    gene: 'APOE',
    chromosome: 'chr19',
    position: 44908684,
    reference: 'C',
    alternate: 'T',
    type: 'SNV',
    impact: 'Low',
    quality: 93.8,
    clinicalSignificance: 'Likely Benign',
    depth: 87,
    pValue: 6.8e-6,
    transcript: 'NM_000041.4',
    notes: 'Полезен как сопутствующий риск-фактор, но не как самостоятельный вывод.',
  },
  {
    gene: 'HBB',
    chromosome: 'chr11',
    position: 5227002,
    reference: 'CT',
    alternate: 'C',
    type: 'Deletion',
    impact: 'Moderate',
    quality: 95.4,
    clinicalSignificance: 'VUS',
    depth: 102,
    pValue: 4.4e-5,
    transcript: 'NM_000518.5',
    notes: 'Интерпретация зависит от гаплотипа и сопутствующих гемоглобинопатий.',
  },
  {
    gene: 'EGFR',
    chromosome: 'chr7',
    position: 55249071,
    reference: 'G',
    alternate: 'GAAG',
    type: 'Insertion',
    impact: 'High',
    quality: 97.6,
    clinicalSignificance: 'Likely Pathogenic',
    depth: 111,
    pValue: 3.8e-7,
    transcript: 'NM_005228.5',
    notes: 'Вариант рекомендуется проверить в таргетной панели для клинического подтверждения.',
  },
  {
    gene: 'SMN1',
    chromosome: 'chr5',
    position: 70247773,
    reference: 'N',
    alternate: 'DEL',
    type: 'CNV',
    impact: 'High',
    quality: 91.2,
    clinicalSignificance: 'Pathogenic',
    depth: 74,
    pValue: 9.5e-6,
    transcript: 'NM_000344.4',
    notes: 'CNV-профиль требует подтверждения по глубине покрытия и ортогональным методом.',
  },
  {
    gene: 'MTHFR',
    chromosome: 'chr1',
    position: 11796321,
    reference: 'C',
    alternate: 'T',
    type: 'SNV',
    impact: 'Low',
    quality: 89.9,
    clinicalSignificance: 'Benign',
    depth: 90,
    pValue: 9.2e-5,
    transcript: 'NM_005957.5',
    notes: 'Частый полиморфизм без самостоятельной клинической значимости.',
  },
  {
    gene: 'LDLR',
    chromosome: 'chr19',
    position: 11124171,
    reference: 'G',
    alternate: 'A',
    type: 'SNV',
    impact: 'Moderate',
    quality: 96.2,
    clinicalSignificance: 'Likely Pathogenic',
    depth: 105,
    pValue: 7.4e-8,
    transcript: 'NM_000527.5',
    notes: 'Соотносится с гиперхолестеринемическими профилями риска.',
  },
  {
    gene: 'COL1A1',
    chromosome: 'chr17',
    position: 50198544,
    reference: 'G',
    alternate: 'T',
    type: 'SNV',
    impact: 'Moderate',
    quality: 94.5,
    clinicalSignificance: 'VUS',
    depth: 98,
    pValue: 2.5e-5,
    transcript: 'NM_000088.4',
    notes: 'Нужен клинический контекст и семейный сегрегационный анализ.',
  },
  {
    gene: 'DMD',
    chromosome: 'chrX',
    position: 31137345,
    reference: 'A',
    alternate: 'T',
    type: 'SNV',
    impact: 'High',
    quality: 97.9,
    clinicalSignificance: 'Pathogenic',
    depth: 84,
    pValue: 1.9e-7,
    transcript: 'NM_004006.3',
    notes: 'Вариант в гене DMD требует учёта пола пациента и покрытия экзонов.',
  },
  {
    gene: 'MLH1',
    chromosome: 'chr3',
    position: 37051241,
    reference: 'C',
    alternate: 'A',
    type: 'SNV',
    impact: 'High',
    quality: 98.6,
    clinicalSignificance: 'Likely Pathogenic',
    depth: 126,
    pValue: 4.2e-9,
    transcript: 'NM_000249.4',
    notes: 'Имеет приоритет для follow-up в сценариях наследственного колоректального риска.',
  },
]

const average = (values: number[]) => {
  if (!values.length) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const createVariantSet = (
  prefix: string,
  shift: number,
  qualityPenalty: number,
): GenomeVariant[] =>
  variantBlueprints.map((variant, index) => ({
    ...variant,
    id: `${prefix}-V${String(index + 1).padStart(2, '0')}`,
    position: variant.position + shift + index * 19,
    quality: Number(
      Math.max(82, variant.quality - qualityPenalty + (index % 3) * 0.4).toFixed(
        1,
      ),
    ),
    depth: variant.depth + (index % 4) * 3,
    pValue: Number((variant.pValue * (1 + shift / 4000)).toExponential(2)),
  }))

const createSummary = ({
  id,
  sampleId,
  fileName,
  format,
  genomeBuild,
  date,
  status,
  variantCount,
  coverage,
  fileSizeMb,
  variants,
}: {
  id: string
  sampleId: string
  fileName: string
  format: SupportedFormat
  genomeBuild: GenomeBuildId
  date: string
  status: AnalysisSummary['status']
  variantCount: number
  coverage: number
  fileSizeMb: number
  variants: GenomeVariant[]
}): AnalysisSummary => ({
  id,
  sampleId,
  fileName,
  format,
  genomeBuild,
  date,
  status,
  variantCount,
  highImpactVariants: variants.filter((variant) => variant.impact === 'High').length,
  pathogenicVariants: variants.filter((variant) =>
    pathogenicSet.has(variant.clinicalSignificance),
  ).length,
  coverage,
  meanQuality: Number(average(variants.map((variant) => variant.quality)).toFixed(1)),
  fileSizeMb,
})

const completedAnalysisA = createVariantSet('GS-7721', 0, 0)
const completedAnalysisB = createVariantSet('GS-7718', 137, 1.8)
const completedAnalysisC = createVariantSet('GS-7699', 269, 0.9)

export const mockVariantsByAnalysis: Record<string, GenomeVariant[]> = {
  'GS-7721': completedAnalysisA,
  'GS-7718': completedAnalysisB,
  'GS-7699': completedAnalysisC,
}

export const mockReports: AnalysisSummary[] = [
  createSummary({
    id: 'GS-7721',
    sampleId: 'GS-7721',
    fileName: 'sample_a1_full_genome.vcf',
    format: 'VCF',
    genomeBuild: 'hg38',
    date: '2026-03-12',
    status: 'completed',
    variantCount: 1842,
    coverage: 36.4,
    fileSizeMb: 4860,
    variants: completedAnalysisA,
  }),
  createSummary({
    id: 'GS-7718',
    sampleId: 'GS-7718',
    fileName: 'patient_x_exome.bam',
    format: 'BAM',
    genomeBuild: 'hg19',
    date: '2026-03-10',
    status: 'completed',
    variantCount: 684,
    coverage: 118.7,
    fileSizeMb: 420,
    variants: completedAnalysisB,
  }),
  createSummary({
    id: 'GS-7715',
    sampleId: 'GS-7715',
    fileName: 'rapid_panel_run.bed',
    format: 'BED',
    genomeBuild: 'hg38',
    date: '2026-03-09',
    status: 'processing',
    variantCount: 0,
    coverage: 0,
    fileSizeMb: 118,
    variants: [],
  }),
  createSummary({
    id: 'GS-7699',
    sampleId: 'GS-7699',
    fileName: 'control_sample_v2.fasta',
    format: 'FASTA',
    genomeBuild: 't2t',
    date: '2026-02-28',
    status: 'completed',
    variantCount: 1328,
    coverage: 28.9,
    fileSizeMb: 5120,
    variants: completedAnalysisC,
  }),
]

const getFormatFromFileName = (fileName: string): SupportedFormat => {
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
  genomeBuild: GenomeBuildId,
): UploadAnalysisResult => {
  const seed = Array.from(file.name).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const id = `GS-${String(Date.now()).slice(-5)}`
  const variants = createVariantSet(id, seed % 240, (seed % 5) * 0.7)
  const fileSizeMb = Math.max(96, Math.round(file.size / (1024 * 1024)) || 128)

  return {
    summary: createSummary({
      id,
      sampleId: id,
      fileName: file.name,
      format: getFormatFromFileName(file.name),
      genomeBuild,
      date: new Date().toISOString().slice(0, 10),
      status: 'completed',
      variantCount: 1200 + (seed % 900),
      coverage: Number((24 + (seed % 18) + average(variants.map((item) => item.depth)) / 30).toFixed(1)),
      fileSizeMb,
      variants,
    }),
    variants,
  }
}
