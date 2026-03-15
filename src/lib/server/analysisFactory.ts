import { randomUUID } from 'node:crypto'
import type {
  AnalysisStatus,
  AnalysisSummary,
  AssemblyId,
  PipelineMode,
  SpeciesId,
  SupportedFormat,
  UploadAnalysisResult,
  VariantAnnotation,
  WorkbenchData,
} from '@/types/genome'

const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0

const speciesPrefix = (speciesId: SpeciesId) =>
  speciesId === 'arabidopsis_thaliana' ? 'AT' : 'PL'

export const getFormatFromFileName = (fileName: string): SupportedFormat => {
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

export const createAnalysisId = (speciesId: SpeciesId) =>
  `PS-${speciesPrefix(speciesId)}-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`

export const createAnalysisSummary = ({
  id,
  fileName,
  fileSize,
  speciesId,
  assemblyId,
  status,
  pipelineMode,
  variants,
  workbench,
  statusDetail = null,
  storedFilePath = null,
  createdAt = new Date().toISOString(),
  updatedAt = createdAt,
}: {
  id: string
  fileName: string
  fileSize: number
  speciesId: SpeciesId
  assemblyId: AssemblyId
  status: AnalysisStatus
  pipelineMode: PipelineMode
  variants: VariantAnnotation[]
  workbench: WorkbenchData | null
  statusDetail?: string | null
  storedFilePath?: string | null
  createdAt?: string
  updatedAt?: string
}): AnalysisSummary => ({
  id,
  sampleId: id,
  fileName,
  format: getFormatFromFileName(fileName),
  speciesId,
  assemblyId,
  date: createdAt.slice(0, 10),
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
  fileSizeMb: Math.max(0.01, Number((fileSize / (1024 * 1024)).toFixed(2))),
  focusGene:
    workbench?.gene?.symbol ??
    variants[0]?.geneSymbol ??
    (status === 'queued' ? 'Queued run' : 'N/A'),
  insightCount:
    variants.length +
    (workbench
      ? [
          workbench.expression ? 1 : 0,
          workbench.regulation.length ? 1 : 0,
          workbench.functionTerms.length ? 1 : 0,
          workbench.interactions.length ? 1 : 0,
          workbench.orthology.length ? 1 : 0,
          workbench.literature.length ? 1 : 0,
        ].reduce((sum, value) => sum + value, 0)
      : 0),
  createdAt,
  updatedAt,
  statusDetail,
  pipelineMode,
  storedFilePath,
})

export const createAnalysisResult = ({
  id,
  fileName,
  fileSize,
  speciesId,
  assemblyId,
  status,
  pipelineMode,
  variants,
  workbench,
  statusDetail = null,
  storedFilePath = null,
  createdAt,
  updatedAt,
}: {
  id: string
  fileName: string
  fileSize: number
  speciesId: SpeciesId
  assemblyId: AssemblyId
  status: AnalysisStatus
  pipelineMode: PipelineMode
  variants: VariantAnnotation[]
  workbench: WorkbenchData | null
  statusDetail?: string | null
  storedFilePath?: string | null
  createdAt?: string
  updatedAt?: string
}): UploadAnalysisResult => ({
  summary: createAnalysisSummary({
    id,
    fileName,
    fileSize,
    speciesId,
    assemblyId,
    status,
    pipelineMode,
    variants,
    workbench,
    statusDetail,
    storedFilePath,
    createdAt,
    updatedAt,
  }),
  variants,
  workbench,
})
