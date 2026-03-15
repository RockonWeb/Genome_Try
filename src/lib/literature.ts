import { DEFAULT_SPECIES_ID, getSpeciesDefinition } from '@/lib/constants'
import { fetchCachedJson } from '@/lib/server/sourceCache'
import type {
  LiteratureCard,
  LiteratureFilters,
  LiteratureSearchResult,
  LiteratureSort,
  SpeciesId,
} from '@/types/genome'

interface EuropePmcSearchResponse {
  resultList?: {
    result?: Array<{
      id?: string
      title?: string
      journalTitle?: string
      pubYear?: string
      authorString?: string
      abstractText?: string
      doi?: string
      citedByCount?: number
      pmid?: string
    }>
  }
}

const EUROPE_PMC_TTL_MS = 12 * 60 * 60 * 1000

const limit = <T,>(items: T[], count: number) => items.slice(0, count)

const safeSummary = (text?: string | null, fallback?: string) =>
  text?.trim() || fallback || 'Europe PMC returned metadata without abstract text.'

export const getDefaultLiteratureFilters = (): LiteratureFilters => ({
  yearFrom: new Date().getFullYear() - 7,
  sort: 'relevance',
  source: 'Europe PMC',
  refresh: false,
})

export const normalizeLiteratureSort = (value?: string | null): LiteratureSort => {
  if (value === 'citations' || value === 'newest' || value === 'relevance') {
    return value
  }

  return 'relevance'
}

export const mapEuropePmcResults = (
  payload: EuropePmcSearchResponse,
): LiteratureCard[] =>
  limit(payload.resultList?.result ?? [], 18).map((item, index) => ({
    id: item.id ?? item.pmid ?? `europepmc-${index + 1}`,
    title: item.title ?? 'Untitled article',
    journal: item.journalTitle ?? 'Unknown journal',
    year: Number(item.pubYear) || new Date().getFullYear(),
    authors: item.authorString
      ? item.authorString
          .split(',')
          .map((author) => author.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [],
    snippet: safeSummary(item.abstractText),
    url: item.pmid
      ? `https://europepmc.org/article/MED/${item.pmid}`
      : `https://europepmc.org/search?query=${encodeURIComponent(item.title ?? '')}`,
    source: 'Europe PMC',
    doi: item.doi,
    citedByCount: item.citedByCount,
  }))

const sortLiteratureCards = (items: LiteratureCard[], sort: LiteratureSort) => {
  if (sort === 'citations') {
    return [...items].sort(
      (left, right) =>
        (right.citedByCount ?? 0) - (left.citedByCount ?? 0) || right.year - left.year,
    )
  }

  if (sort === 'newest') {
    return [...items].sort(
      (left, right) => right.year - left.year || (right.citedByCount ?? 0) - (left.citedByCount ?? 0),
    )
  }

  return items
}

export const searchLiterature = async ({
  query,
  speciesId = DEFAULT_SPECIES_ID,
  filters,
}: {
  query: string
  speciesId?: SpeciesId
  filters?: Partial<LiteratureFilters>
}): Promise<LiteratureSearchResult> => {
  const normalizedQuery = query.trim()
  const normalizedFilters: LiteratureFilters = {
    ...getDefaultLiteratureFilters(),
    ...filters,
  }

  if (!normalizedQuery) {
    return {
      query: '',
      speciesId,
      filters: normalizedFilters,
      items: [],
    }
  }

  const species = getSpeciesDefinition(speciesId)
  const searchQuery = `${normalizedQuery} ${species.label}`
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(searchQuery)}&format=json&pageSize=18`
  const { payload } = await fetchCachedJson<EuropePmcSearchResponse>({
    source: 'europepmc',
    url,
    ttlMs: EUROPE_PMC_TTL_MS,
    refresh: normalizedFilters.refresh,
  })

  const sortedItems = sortLiteratureCards(
    mapEuropePmcResults(payload).filter((item) => item.year >= normalizedFilters.yearFrom),
    normalizedFilters.sort,
  )

  return {
    query: normalizedQuery,
    speciesId,
    filters: normalizedFilters,
    items: sortedItems,
  }
}
