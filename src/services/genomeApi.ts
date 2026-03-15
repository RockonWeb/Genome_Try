import type {
  AnalysisSummary,
  AssemblyId,
  SpeciesId,
  UploadAnalysisResult,
} from '@/types/genome'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const cloneResult = (result: UploadAnalysisResult): UploadAnalysisResult => ({
  summary: { ...result.summary },
  variants: result.variants.map((variant) => ({ ...variant })),
  workbench: result.workbench
    ? {
        ...result.workbench,
        query: { ...result.workbench.query },
        gene: result.workbench.gene ? { ...result.workbench.gene } : null,
        locus: result.workbench.locus ? { ...result.workbench.locus } : null,
        variants: result.workbench.variants.map((variant) => ({ ...variant })),
        expression: result.workbench.expression
          ? {
              ...result.workbench.expression,
              tissues: result.workbench.expression.tissues.map((item) => ({
                ...item,
              })),
              conditions: result.workbench.expression.conditions.map(
                (item) => ({ ...item }),
              ),
            }
          : null,
        regulation: result.workbench.regulation.map((item) => ({ ...item })),
        functionTerms: result.workbench.functionTerms.map((item) => ({
          ...item,
        })),
        interactions: result.workbench.interactions.map((item) => ({
          ...item,
        })),
        orthology: result.workbench.orthology.map((item) => ({ ...item })),
        literature: result.workbench.literature.map((item) => ({ ...item })),
        supportingLinks: result.workbench.supportingLinks.map((item) => ({
          ...item,
        })),
        sourceStatus: result.workbench.sourceStatus.map((item) => ({
          ...item,
        })),
      }
    : null,
})

export const genomeApi = {
  async uploadFile(
    file: File,
    onProgress: (progress: number) => void,
    speciesId: SpeciesId,
    assemblyId: AssemblyId,
  ): Promise<UploadAnalysisResult> {
    for (const step of [10, 22, 38, 56, 71, 86]) {
      await delay(140)
      onProgress(step)
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('speciesId', speciesId)
    formData.append('assemblyId', assemblyId)

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

  async getReports(): Promise<AnalysisSummary[]> {
    const response = await fetch('/api/analyses', {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch reports')
    }

    return (await response.json()) as AnalysisSummary[]
  },

  async getAnalysisResult(id: string): Promise<UploadAnalysisResult | null> {
    const response = await fetch(`/api/analyses/${encodeURIComponent(id)}`, {
      method: 'GET',
      cache: 'no-store',
    })

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error('Failed to fetch analysis result')
    }

    return cloneResult((await response.json()) as UploadAnalysisResult)
  },
}
