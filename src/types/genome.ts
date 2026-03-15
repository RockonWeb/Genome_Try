export type SupportedFormat = 'FASTA' | 'VCF' | 'BAM' | 'BED'

export type AnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed'

export type PipelineMode = 'vcf_live' | 'deferred_backend'

export type SpeciesId =
  | 'arabidopsis_thaliana'
  | 'oryza_sativa'
  | 'zea_mays'
  | 'glycine_max'

export type AssemblyId = 'TAIR10' | 'IRGSP-1.0' | 'AGPv4' | 'Wm82.a4.v1'

export type VariantEffectType = 'SNV' | 'Insertion' | 'Deletion' | 'MNV'

export type PredictedImpact = 'HIGH' | 'MODERATE' | 'LOW' | 'MODIFIER'

export type FeatureType =
  | 'gene'
  | 'transcript'
  | 'regulatory'
  | 'intergenic'
  | 'locus'

export type EvidenceType =
  | 'curated'
  | 'experimental'
  | 'computational'
  | 'literature'
  | 'heuristic'

export type QueryType = 'gene' | 'symbol' | 'locus' | 'variant' | 'unknown'

export type SourceHealth = 'online' | 'degraded' | 'offline'

export type SourceObservation = 'live' | 'cache'

export type LiteratureSort = 'relevance' | 'citations' | 'newest'

export type LiteratureSource = 'Europe PMC'

export interface AssemblyDefinition {
  id: AssemblyId
  name: string
  description: string
}

export interface SpeciesDefinition {
  id: SpeciesId
  label: string
  commonName: string
  taxonId: number
  defaultAssemblyId: AssemblyId
  assemblies: AssemblyDefinition[]
  capabilities: {
    arabidopsisDepth: boolean
    expression: 'full' | 'baseline'
    regulation: 'full' | 'baseline'
    literature: 'full' | 'baseline'
  }
}

export interface EvidenceLink {
  label: string
  url: string
  source: string
}

export interface SourceSummary {
  source: string
  label: string
  description: string
  url?: string
}

export interface SourceStatus {
  source: string
  label: string
  status: SourceHealth
  coverage: 'full' | 'partial' | 'link-only'
  detail: string
  lastChecked: string
  observedVia: SourceObservation
}

export interface GeneLocation {
  chromosome: string
  start: number
  end: number
  strand: 1 | -1
}

export interface GeneProfile {
  id: string
  symbol: string
  name: string
  speciesId: SpeciesId
  assemblyId: AssemblyId
  biotype: string
  description: string
  aliases: string[]
  location: GeneLocation
  sourceSummaries: SourceSummary[]
  externalLinks: EvidenceLink[]
  lastUpdated: string
}

export interface VariantAnnotation {
  id: string
  geneId?: string
  geneSymbol: string
  chromosome: string
  position: number
  reference: string
  alternate: string
  type: VariantEffectType
  predictedImpact: PredictedImpact
  consequenceTerms: string[]
  featureType: FeatureType
  transcript: string
  source: string
  evidenceType: EvidenceType
  quality: number
  depth: number
  score: number
  lastUpdated: string
  notes: string
}

export interface ExpressionPoint {
  label: string
  value: number
  unit: string
  context: string
  source: string
  url?: string
}

export interface ExpressionProfile {
  summary: string
  tissues: ExpressionPoint[]
  conditions: ExpressionPoint[]
  source: string
  atlasLink?: string
  lastUpdated: string
}

export interface RegulationEvidence {
  title: string
  summary: string
  evidenceType: EvidenceType
  source: string
  tags: string[]
  score: number
  url?: string
}

export interface FunctionTerm {
  id: string
  label: string
  category: 'BP' | 'MF' | 'CC' | 'PO' | 'Pathway'
  source: string
  evidence?: string
  url?: string
}

export interface InteractionSummary {
  partnerId: string
  partnerLabel: string
  relation: string
  source: string
  confidence?: number
  url?: string
}

export interface OrthologyProfile {
  speciesLabel: string
  geneId: string
  geneLabel: string
  relationship: string
  source: string
  confidence?: number
  url?: string
}

export interface LiteratureCard {
  id: string
  title: string
  journal: string
  year: number
  authors: string[]
  snippet: string
  url: string
  source: string
  doi?: string
  citedByCount?: number
}

export interface LocusQuery {
  chromosome: string
  start: number
  end: number
  regionLabel: string
  overlappingGeneIds: string[]
  source: string
}

export interface ResearchQuery {
  raw: string
  normalized: string
  type: QueryType
  speciesId: SpeciesId
  assemblyId: AssemblyId
  geneId?: string
  geneSymbol?: string
  locus?: LocusQuery
  variantLabel?: string
}

export interface SearchCandidate {
  id: string
  label: string
  type: QueryType
  reason: string
  source: string
}

export interface SearchResolution {
  query: ResearchQuery
  candidates: SearchCandidate[]
}

export interface WorkbenchData {
  query: ResearchQuery
  species: SpeciesDefinition
  gene: GeneProfile | null
  locus: LocusQuery | null
  variants: VariantAnnotation[]
  expression: ExpressionProfile | null
  regulation: RegulationEvidence[]
  functionTerms: FunctionTerm[]
  interactions: InteractionSummary[]
  orthology: OrthologyProfile[]
  literature: LiteratureCard[]
  supportingLinks: EvidenceLink[]
  sourceStatus: SourceStatus[]
}

export interface AnalysisSummary {
  id: string
  sampleId: string
  fileName: string
  format: SupportedFormat
  speciesId: SpeciesId
  assemblyId: AssemblyId
  date: string
  status: AnalysisStatus
  variantCount: number
  highImpactVariants: number
  meanDepth: number
  meanQuality: number
  fileSizeMb: number
  focusGene: string
  insightCount: number
  createdAt: string
  updatedAt: string
  statusDetail: string | null
  pipelineMode: PipelineMode
  storedFilePath: string | null
}

export interface UploadAnalysisResult {
  summary: AnalysisSummary
  variants: VariantAnnotation[]
  workbench: WorkbenchData | null
}

export interface LiteratureFilters {
  yearFrom: number
  sort: LiteratureSort
  source: LiteratureSource
  refresh: boolean
}

export interface LiteratureSearchResult {
  query: string
  speciesId: SpeciesId
  filters: LiteratureFilters
  items: LiteratureCard[]
}

export interface ChartData {
  name: string
  value: number
  fill?: string
}

export interface GenomeContextPoint {
  id: string
  geneSymbol: string
  chromosome: string
  position: number
  score: number
  fill: string
}

export interface VariantFilters {
  search?: string
  chromosome?: string
  type?: VariantEffectType | 'all'
  predictedImpact?: PredictedImpact | 'all'
}
