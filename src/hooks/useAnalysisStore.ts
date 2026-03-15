import { create } from 'zustand'
import { genomeApi } from '@/services/genomeApi'
import type {
  AnalysisSummary,
  AssemblyId,
  SpeciesId,
  UploadAnalysisResult,
  VariantAnnotation,
  WorkbenchData,
} from '@/types/genome'

interface AnalysisState {
  currentAnalysis: AnalysisSummary | null
  variants: VariantAnnotation[]
  currentWorkbench: WorkbenchData | null
  reports: AnalysisSummary[]
  analysesById: Record<string, UploadAnalysisResult>
  isLoading: boolean
  progress: number
  error: string | null
  uploadFile: (
    file: File,
    speciesId: SpeciesId,
    assemblyId: AssemblyId,
  ) => Promise<AnalysisSummary>
  fetchReports: () => Promise<void>
  fetchAnalysisResults: (id: string) => Promise<void>
  resetProgress: () => void
  clearError: () => void
}

const sortReports = (reports: AnalysisSummary[]) =>
  [...reports].sort(
    (left, right) =>
      right.date.localeCompare(left.date) || right.id.localeCompare(left.id),
  )

const uniqueReports = (reports: AnalysisSummary[]) =>
  Array.from(new Map(reports.map((report) => [report.id, report])).values())

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  currentAnalysis: null,
  variants: [],
  currentWorkbench: null,
  reports: [],
  analysesById: {},
  isLoading: false,
  progress: 0,
  error: null,

  resetProgress: () => set({ progress: 0, error: null }),
  clearError: () => set({ error: null }),

  uploadFile: async (file, speciesId, assemblyId) => {
    set({ isLoading: true, error: null, progress: 0 })

    try {
      const result = await genomeApi.uploadFile(
        file,
        (progress) => set({ progress }),
        speciesId,
        assemblyId,
      )

      set((state) => ({
        currentAnalysis: result.summary,
        variants: result.variants,
        currentWorkbench: result.workbench,
        analysesById: {
          ...state.analysesById,
          [result.summary.id]: result,
        },
        reports: sortReports(uniqueReports([result.summary, ...state.reports])),
        isLoading: false,
        progress: 100,
      }))

      return result.summary
    } catch {
      set({
        error: 'Не удалось завершить загрузку и plant-aware анализ файла.',
        isLoading: false,
        progress: 0,
      })
      throw new Error('Upload failed')
    }
  },

  fetchReports: async () => {
    set({ isLoading: true, error: null })

    try {
      const remoteReports = await genomeApi.getReports()

      set((state) => {
        const mergedReports = sortReports(
          uniqueReports([...state.reports, ...remoteReports]),
        )

        return {
          reports: mergedReports,
          currentAnalysis: state.currentAnalysis ?? mergedReports[0] ?? null,
          isLoading: false,
        }
      })
    } catch {
      set({
        error: 'Не удалось загрузить список запусков.',
        isLoading: false,
      })
    }
  },

  fetchAnalysisResults: async (id) => {
    const cached = get().analysesById[id]
    if (cached) {
      set({
        currentAnalysis: cached.summary,
        variants: cached.variants,
        currentWorkbench: cached.workbench,
        error: null,
      })
      return
    }

    set({ isLoading: true, error: null })

    try {
      const result = await genomeApi.getAnalysisResult(id)

      if (!result) {
        throw new Error('Missing analysis result')
      }

      set((state) => ({
        currentAnalysis: result.summary,
        variants: result.variants,
        currentWorkbench: result.workbench,
        analysesById: {
          ...state.analysesById,
          [id]: result,
        },
        reports: sortReports(uniqueReports([...state.reports, result.summary])),
        isLoading: false,
      }))
    } catch {
      set({
        error: 'Не удалось загрузить результаты анализа.',
        isLoading: false,
      })
    }
  },
}))
