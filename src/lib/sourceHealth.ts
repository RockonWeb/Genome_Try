import { SOURCE_CATALOG, getSpeciesDefinition } from '@/lib/constants'
import {
  readSourceHealthStatuses,
  saveSourceHealthStatuses,
} from '@/lib/server/analysisRepository'
import { fetchCachedJson } from '@/lib/server/sourceCache'
import type { SourceStatus, SpeciesId } from '@/types/genome'

const ENSEMBL_TTL_MS = 24 * 60 * 60 * 1000
const ATLAS_TTL_MS = 24 * 60 * 60 * 1000
const THALEMINE_TTL_MS = 24 * 60 * 60 * 1000
const EUROPE_PMC_TTL_MS = 12 * 60 * 60 * 1000
const SOURCE_HEALTH_TTL_MS = 15 * 60 * 1000

const probeGeneBySpecies: Record<SpeciesId, string> = {
  arabidopsis_thaliana: 'AT1G01010',
  oryza_sativa: 'AT1G01010',
  zea_mays: 'AT1G01010',
  glycine_max: 'AT1G01010',
}

const createStatus = ({
  source,
  label,
  status,
  coverage,
  detail,
  lastChecked,
  observedVia,
}: SourceStatus): SourceStatus => ({
  source,
  label,
  status,
  coverage,
  detail,
  lastChecked,
  observedVia,
})

const sortStatuses = (statuses: SourceStatus[]) =>
  SOURCE_CATALOG.map((item) =>
    statuses.find((status) => status.source === item.source),
  ).filter(Boolean) as SourceStatus[]

export const getSourceStatuses = async (
  speciesId: SpeciesId,
  options: { refresh?: boolean } = {},
) => {
  const snapshots = readSourceHealthStatuses(speciesId)
  const now = Date.now()
  const refresh = options.refresh ?? false

  if (
    !refresh &&
    snapshots.length === SOURCE_CATALOG.length &&
    snapshots.every((snapshot) => new Date(snapshot.expiresAt).getTime() > now)
  ) {
    return sortStatuses(
      snapshots.map((snapshot) => ({
        ...snapshot.status,
        observedVia: 'cache',
      })),
    )
  }

  const species = getSpeciesDefinition(speciesId)
  const probeGene = probeGeneBySpecies[speciesId]
  const checkedAt = new Date().toISOString()
  const statuses: SourceStatus[] = []

  try {
    const ensembl = await fetchCachedJson<Record<string, unknown>>({
      source: 'ensembl',
      url: `https://rest.ensembl.org/info/genomes/${speciesId}`,
      ttlMs: ENSEMBL_TTL_MS,
      refresh,
    })

    statuses.push(
      createStatus({
        source: 'ensembl',
        label: 'Ensembl Plants REST',
        status: 'online',
        coverage: 'full',
        detail: 'Эндпоинт метаданных генома ответил успешно.',
        lastChecked: ensembl.fetchedAt,
        observedVia: ensembl.observedVia,
      }),
    )
  } catch {
    statuses.push(
      createStatus({
        source: 'ensembl',
        label: 'Ensembl Plants REST',
        status: 'offline',
        coverage: 'partial',
        detail: 'Эндпоинт метаданных генома не ответил вовремя.',
        lastChecked: checkedAt,
        observedVia: 'live',
      }),
    )
  }

  if (speciesId === 'arabidopsis_thaliana') {
    try {
      const thaleMine = await fetchCachedJson<Record<string, unknown>>({
        source: 'thalemine',
        url: `https://bar.utoronto.ca/thalemine/service/search?q=${encodeURIComponent(probeGene)}&format=json`,
        ttlMs: THALEMINE_TTL_MS,
        refresh,
      })

      statuses.push(
        createStatus({
          source: 'thalemine',
          label: 'BAR ThaleMine',
          status: 'online',
          coverage: 'partial',
          detail: 'Поисковый эндпоинт для Arabidopsis вернул ответ.',
          lastChecked: thaleMine.fetchedAt,
          observedVia: thaleMine.observedVia,
        }),
      )
    } catch {
      statuses.push(
        createStatus({
          source: 'thalemine',
          label: 'BAR ThaleMine',
          status: 'degraded',
          coverage: 'link-only',
          detail: 'Поисковый эндпоинт для Arabidopsis сейчас недоступен.',
          lastChecked: checkedAt,
          observedVia: 'live',
        }),
      )
    }
  } else {
    statuses.push(
      createStatus({
        source: 'thalemine',
        label: 'BAR ThaleMine',
        status: 'degraded',
        coverage: 'link-only',
        detail:
          'Коннектор для Arabidopsis не опрашивается для выбранного вида.',
        lastChecked: checkedAt,
        observedVia: 'live',
      }),
    )
  }

  try {
    const atlas = await fetchCachedJson<Record<string, unknown>>({
      source: 'expression-atlas',
      url: `https://www.ebi.ac.uk/gxa/json/bioentity-information/${encodeURIComponent(probeGene)}`,
      ttlMs: ATLAS_TTL_MS,
      refresh,
    })

    statuses.push(
      createStatus({
        source: 'expression-atlas',
        label: 'Expression Atlas',
        status: 'online',
        coverage: 'partial',
        detail: 'Эндпоинт с bioentity-информацией ответил успешно.',
        lastChecked: atlas.fetchedAt,
        observedVia: atlas.observedVia,
      }),
    )
  } catch {
    statuses.push(
      createStatus({
        source: 'expression-atlas',
        label: 'Expression Atlas',
        status: 'degraded',
        coverage: 'link-only',
        detail: 'Сейчас доступны только внешние ссылки на атлас.',
        lastChecked: checkedAt,
        observedVia: 'live',
      }),
    )
  }

  try {
    const literature = await fetchCachedJson<Record<string, unknown>>({
      source: 'europepmc',
      url: `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(`plant genomics ${species.label}`)}&format=json&pageSize=3`,
      ttlMs: EUROPE_PMC_TTL_MS,
      refresh,
    })

    statuses.push(
      createStatus({
        source: 'europepmc',
        label: 'Europe PMC',
        status: 'online',
        coverage: 'full',
        detail: 'Эндпоинт поиска литературы ответил успешно.',
        lastChecked: literature.fetchedAt,
        observedVia: literature.observedVia,
      }),
    )
  } catch {
    statuses.push(
      createStatus({
        source: 'europepmc',
        label: 'Europe PMC',
        status: 'degraded',
        coverage: 'link-only',
        detail:
          'Эндпоинт поиска литературы недоступен, но сохранённые ссылки продолжают работать.',
        lastChecked: checkedAt,
        observedVia: 'live',
      }),
    )
  }

  statuses.push(
    createStatus({
      source: 'tair',
      label: 'TAIR',
      status: 'degraded',
      coverage: 'link-only',
      detail:
        'Премиальный коннектор опционален и отключён в этом рабочем пространстве.',
      lastChecked: checkedAt,
      observedVia: 'live',
    }),
  )

  saveSourceHealthStatuses(
    speciesId,
    statuses,
    new Date(Date.now() + SOURCE_HEALTH_TTL_MS).toISOString(),
  )

  return sortStatuses(statuses)
}
