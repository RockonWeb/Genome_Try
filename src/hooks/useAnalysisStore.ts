import { create } from 'zustand'
import { genomeApi } from '@/services/genomeApi'
import type {
  AnalysisSummary,
  GenomeBuildId,
  GenomeVariant,
} from '@/types/genome'

interface AnalysisState {
  currentAnalysis: AnalysisSummary | null
  variants: GenomeVariant[]
  reports: AnalysisSummary[]
  variantsByAnalysis: Record<string, GenomeVariant[]>
  isLoading: boolean
  progress: number
  error: string | null
  uploadFile: (file: File, genomeBuild: GenomeBuildId) => Promise<AnalysisSummary>
  fetchReports: () => Promise<void>
  fetchAnalysisResults: (id: string) => Promise<void>
  setCurrentAnalysis: (analysis: AnalysisSummary | null) => void
  resetProgress: () => void
  clearError: () => void
}

const sortReports = (reports: AnalysisSummary[]) =>
  [...reports].sort(
    (left, right) => right.date.localeCompare(left.date) || right.id.localeCompare(left.id),
  )

const uniqueReports = (reports: AnalysisSummary[]) =>
  Array.from(new Map(reports.map((report) => [report.id, report])).values())

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  currentAnalysis: null,
  variants: [],
  reports: [],
  variantsByAnalysis: {},
  isLoading: false,
  progress: 0,
  error: null,

  resetProgress: () => set({ progress: 0, error: null }),
  clearError: () => set({ error: null }),

  setCurrentAnalysis: (analysis) =>
    set((state) => ({
      currentAnalysis: analysis,
      variants:
        analysis && state.variantsByAnalysis[analysis.id]
          ? state.variantsByAnalysis[analysis.id]
          : state.variants,
    })),

  uploadFile: async (file, genomeBuild) => {
    set({ isLoading: true, error: null, progress: 0 })

    try {
      const result = await genomeApi.uploadFile(
        file,
        (progress) => set({ progress }),
        genomeBuild,
      )

      set((state) => ({
        currentAnalysis: result.summary,
        variants: result.variants,
        variantsByAnalysis: {
          ...state.variantsByAnalysis,
          [result.summary.id]: result.variants,
        },
        reports: sortReports(
          uniqueReports([result.summary, ...state.reports]),
        ),
        isLoading: false,
        progress: 100,
      }))

      return result.summary
    } catch (error) {
      set({
        error: 'Не удалось завершить загрузку и анализ файла.',
        isLoading: false,
        progress: 0,
      })

      throw error
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
        error: 'Не удалось загрузить список отчётов.',
        isLoading: false,
      })
    }
  },

  fetchAnalysisResults: async (id) => {
    const state = get()
    const hasCachedVariants = Object.prototype.hasOwnProperty.call(
      state.variantsByAnalysis,
      id,
    )
    const cachedSummary = state.reports.find((report) => report.id === id) ?? null

    if (cachedSummary && hasCachedVariants) {
      set({
        currentAnalysis: cachedSummary,
        variants: state.variantsByAnalysis[id] ?? [],
        error: null,
      })
      return
    }

    set({ isLoading: true, error: null })

    try {
      const summary =
        cachedSummary ?? (await genomeApi.getAnalysisSummary(id))
      const variants = hasCachedVariants
        ? state.variantsByAnalysis[id] ?? []
        : await genomeApi.getVariants(id)

      if (!summary) {
        throw new Error('Missing analysis summary')
      }

      set((currentState) => ({
        currentAnalysis: summary,
        variants,
        variantsByAnalysis: {
          ...currentState.variantsByAnalysis,
          [id]: variants,
        },
        reports: sortReports(
          uniqueReports([...currentState.reports, summary]),
        ),
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
