import { DEFAULT_SPECIES_ID, getSpeciesDefinition } from '@/lib/constants'
import { fetchCachedJson } from '@/lib/server/sourceCache'
import { translateLiteratureCards } from '@/lib/server/translation'
import type {
  LiteratureCard,
  LiteratureFilters,
  LiteratureSearchResult,
  LiteratureSort,
  SpeciesId,
} from '@/types/genome'

interface EuropePmcSearchResponse {
  resultList?: {
    result?: EuropePmcResultItem[]
  }
}

interface EuropePmcResultItem {
  id?: string
  title?: string
  journalTitle?: string
  journalInfo?: {
    journal?: {
      title?: string
      isoabbreviation?: string
      isoAbbreviation?: string
    }
  }
  pubYear?: string
  authorString?: string
  abstractText?: string
  doi?: string
  citedByCount?: number
  pmid?: string
}

const EUROPE_PMC_TTL_MS = 12 * 60 * 60 * 1000
const DEFAULT_ABSTRACT_FALLBACK = 'Аннотация недоступна.'

const limit = <T>(items: T[], count: number) => items.slice(0, count)

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  hellip: '...',
  ldquo: '"',
  lsquo: "'",
  lt: '<',
  mdash: '-',
  nbsp: ' ',
  ndash: '-',
  quot: '"',
  rdquo: '"',
  rsquo: "'",
}

const decodeHtmlEntities = (value: string) =>
  value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z][a-z0-9]+);/gi, (entity, body) => {
    if (body.startsWith('#')) {
      const isHex = body[1]?.toLowerCase() === 'x'
      const numericValue = Number.parseInt(
        body.slice(isHex ? 2 : 1),
        isHex ? 16 : 10,
      )

      if (Number.isFinite(numericValue)) {
        return String.fromCodePoint(numericValue)
      }

      return entity
    }

    return HTML_ENTITY_MAP[body.toLowerCase()] ?? entity
  })

const stripMarkup = (value: string) => value.replace(/<\/?[a-z][^>]*>/gi, ' ')

const normalizeLiteratureText = (text?: string | null, fallback?: string) => {
  const normalized = text
    ? stripMarkup(decodeHtmlEntities(text)).replace(/\s+/g, ' ').trim()
    : ''

  return normalized.replace(/\s+([,.;:!?])/g, '$1') || fallback || ''
}

const safeSummary = (text?: string | null, fallback?: string) =>
  normalizeLiteratureText(text, fallback || DEFAULT_ABSTRACT_FALLBACK)

const resolveJournal = (item: EuropePmcResultItem) =>
  normalizeLiteratureText(
    item.journalTitle ??
      item.journalInfo?.journal?.isoabbreviation ??
      item.journalInfo?.journal?.isoAbbreviation ??
      item.journalInfo?.journal?.title,
    'Журнал не указан',
  )

export const getDefaultLiteratureFilters = (): LiteratureFilters => ({
  yearFrom: new Date().getFullYear() - 7,
  sort: 'relevance',
  source: 'Europe PMC',
  translate: true,
  refresh: false,
})

export const normalizeLiteratureSort = (
  value?: string | null,
): LiteratureSort => {
  if (value === 'citations' || value === 'newest' || value === 'relevance') {
    return value
  }

  return 'relevance'
}

export const mapEuropePmcResults = (
  payload: EuropePmcSearchResponse,
): LiteratureCard[] =>
  limit(payload.resultList?.result ?? [], 18).map((item, index) => {
    const title = normalizeLiteratureText(item.title, 'Статья без названия')

    return {
      id: item.id ?? item.pmid ?? `europepmc-${index + 1}`,
      title,
      journal: resolveJournal(item),
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
        : `https://europepmc.org/search?query=${encodeURIComponent(title)}`,
      source: 'Europe PMC',
      doi: item.doi,
      citedByCount: item.citedByCount,
    }
  })

const sortLiteratureCards = (items: LiteratureCard[], sort: LiteratureSort) => {
  if (sort === 'citations') {
    return [...items].sort(
      (left, right) =>
        (right.citedByCount ?? 0) - (left.citedByCount ?? 0) ||
        right.year - left.year,
    )
  }

  if (sort === 'newest') {
    return [...items].sort(
      (left, right) =>
        right.year - left.year ||
        (right.citedByCount ?? 0) - (left.citedByCount ?? 0),
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
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(searchQuery)}&format=json&pageSize=18&resultType=core`
  const { payload } = await fetchCachedJson<EuropePmcSearchResponse>({
    source: 'europepmc',
    url,
    ttlMs: EUROPE_PMC_TTL_MS,
    refresh: normalizedFilters.refresh,
  })

  const filteredItems = mapEuropePmcResults(payload).filter(
    (item) => item.year >= normalizedFilters.yearFrom,
  )
  const sortedItems = sortLiteratureCards(
    normalizedFilters.translate
      ? await translateLiteratureCards(filteredItems).catch(() => filteredItems)
      : filteredItems,
    normalizedFilters.sort,
  )

  return {
    query: normalizedQuery,
    speciesId,
    filters: normalizedFilters,
    items: sortedItems,
  }
}
