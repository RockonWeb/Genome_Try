import { createUploadedAnalysis, mockReports, mockVariantsByAnalysis } from '@/lib/mockData'
import type {
  AnalysisSummary,
  GenomeBuildId,
  GenomeVariant,
  UploadAnalysisResult,
} from '@/types/genome'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const cloneSummary = (summary: AnalysisSummary): AnalysisSummary => ({ ...summary })

const cloneVariants = (variants: GenomeVariant[]): GenomeVariant[] =>
  variants.map((variant) => ({ ...variant }))

export const genomeApi = {
  async uploadFile(
    file: File,
    onProgress: (progress: number) => void,
    genomeBuild: GenomeBuildId,
  ): Promise<UploadAnalysisResult> {
    for (const step of [14, 29, 47, 66, 82, 94, 100]) {
      await delay(140)
      onProgress(step)
    }

    return createUploadedAnalysis(file, genomeBuild)
  },

  async getVariants(id: string): Promise<GenomeVariant[]> {
    await delay(320)
    return cloneVariants(mockVariantsByAnalysis[id] ?? [])
  },

  async getReports(): Promise<AnalysisSummary[]> {
    await delay(260)
    return mockReports.map(cloneSummary)
  },

  async getAnalysisSummary(id: string): Promise<AnalysisSummary | null> {
    await delay(180)
    const summary = mockReports.find((report) => report.id === id)
    return summary ? cloneSummary(summary) : null
  },
}
