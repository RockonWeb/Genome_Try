import { mockReports, mockVariantsByAnalysis } from '@/lib/mockData'
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
    for (const step of [12, 24, 39, 57, 72, 86]) {
      await delay(140)
      onProgress(step)
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('genomeBuild', genomeBuild)

    const response = await fetch('/api/analysis/upload', {
      method: 'POST',
      body: formData,
    })

    const payload = (await response.json()) as
      | UploadAnalysisResult
      | { message?: string }

    if (!response.ok) {
      throw new Error(
        'message' in payload && payload.message
          ? payload.message
          : 'Upload request failed',
      )
    }

    onProgress(100)

    return payload as UploadAnalysisResult
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
