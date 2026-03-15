export type MutationType = 'SNV' | 'Insertion' | 'Deletion' | 'CNV'

export type VariantImpact = 'High' | 'Moderate' | 'Low'

export type ClinicalSignificance =
  | 'Pathogenic'
  | 'Likely Pathogenic'
  | 'VUS'
  | 'Likely Benign'
  | 'Benign'

export type AnalysisStatus = 'processing' | 'completed' | 'failed'

export type GenomeBuildId = 'hg38' | 'hg19' | 't2t'

export type SupportedFormat = 'FASTA' | 'VCF' | 'BAM' | 'BED'

export interface GenomeVariant {
  id: string
  gene: string
  chromosome: string
  position: number
  reference: string
  alternate: string
  type: MutationType
  impact: VariantImpact
  quality: number
  clinicalSignificance: ClinicalSignificance
  depth: number
  pValue: number
  transcript: string
  notes: string
}

export interface AnalysisSummary {
  id: string
  sampleId: string
  fileName: string
  format: SupportedFormat
  genomeBuild: GenomeBuildId
  date: string
  status: AnalysisStatus
  variantCount: number
  highImpactVariants: number
  pathogenicVariants: number
  coverage: number
  meanQuality: number
  fileSizeMb: number
}

export interface UploadAnalysisResult {
  summary: AnalysisSummary
  variants: GenomeVariant[]
}

export interface ChartData {
  name: string
  value: number
  fill?: string
}

export interface ManhattanPoint {
  id: string
  gene: string
  chromosome: string
  position: number
  score: number
  fill: string
}

export interface VariantFilters {
  search?: string
  chromosome?: string
  type?: MutationType | 'all'
  clinicalSignificance?: ClinicalSignificance | 'all'
}
