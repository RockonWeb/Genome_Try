import { DEFAULT_SPECIES_ID, getSpeciesDefinition } from '@/lib/constants'
import { annotatePlantVariant, fetchGeneProfileFromEnsembl, fetchGenesForRegion, fetchOrthologues, getLocalVariantContext, resolveGeneIdFromSymbol } from '@/lib/ensembl'
import { getMockWorkbench } from '@/lib/mockData'
import { parseResearchQuery } from '@/lib/query'
import type {
  ExpressionProfile,
  FunctionTerm,
  LiteratureCard,
  RegulationEvidence,
  SearchCandidate,
  SearchResolution,
  SourceStatus,
  SpeciesId,
  WorkbenchData,
} from '@/types/genome'

interface ThaleMineSearchResponse {
  results?: Array<{
    fields?: {
      primaryIdentifier?: string
      symbol?: string
      name?: string
      tairAliases?: string
      tairCuratorSummary?: string
      tairComputationalDescription?: string
    }
  }>
}

interface AtlasBioEntityInfo {
  bioentityProperties?: Array<{
    type: string
    values: Array<{ text: string; url?: string; relevance?: number }>
  }>
}

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
      source?: string
    }>
  }
}

const today = () => new Date().toISOString().slice(0, 10)

const fetchJson = async <T>(url: string) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

const limit = <T,>(items: T[], count: number) => items.slice(0, count)

const safeSummary = (text?: string | null, fallback?: string) =>
  text?.trim() || fallback || 'Источник не вернул текстовое описание.'

const mapAtlasToFunctionTerms = (payload: AtlasBioEntityInfo): FunctionTerm[] =>
  (payload.bioentityProperties ?? [])
    .flatMap((section) =>
      section.values.map((item) => ({
        id: item.url?.match(/(GO|PO)_\d+/)?.[0]?.replace('_', ':') ?? item.text,
        label: item.text,
        category:
          section.type === 'go'
            ? ('BP' as const)
            : section.type === 'po'
              ? ('PO' as const)
              : ('Pathway' as const),
        source: section.type === 'po' ? 'Plant Ontology' : 'GO / Expression Atlas',
        url: item.url,
      })),
    )
    .slice(0, 8)

const mapAtlasToExpression = (
  geneId: string,
  speciesId: SpeciesId,
  payload: AtlasBioEntityInfo,
): ExpressionProfile => {
  const poTerms = (payload.bioentityProperties ?? []).find((item) => item.type === 'po')
  const topTissues = limit(poTerms?.values ?? [], 4)

  return {
    summary:
      topTissues.length > 0
        ? `Expression Atlas связывает ${geneId} с ${topTissues
            .map((item) => item.text)
            .join(', ')}.`
        : `Expression Atlas подтвердил наличие bioentity-информации для ${geneId}.`,
    tissues: topTissues.map((item, index) => ({
      label: item.text,
      value: Math.max(18, 72 - index * 11),
      unit: 'relative relevance',
      context: 'Expression Atlas bioentity info',
      source: 'Expression Atlas',
      url: item.url,
    })),
    conditions: [
      {
        label: 'Atlas coverage',
        value: topTissues.length || 1,
        unit: 'matched PO contexts',
        context: speciesId,
        source: 'Expression Atlas',
      },
    ],
    source: 'Expression Atlas',
    atlasLink: `https://www.ebi.ac.uk/gxa/genes/${geneId}?species=${speciesId}`,
    lastUpdated: today(),
  }
}

const mapAtlasToRegulation = (payload: AtlasBioEntityInfo): RegulationEvidence[] => {
  const goTerms = (payload.bioentityProperties ?? []).find((item) => item.type === 'go')

  return limit(goTerms?.values ?? [], 3).map((item, index) => ({
    title: item.text,
    summary: `Ontology-backed evidence term from Expression Atlas bioentity information.`,
    evidenceType: 'computational',
    source: 'Expression Atlas',
    tags: ['GO-backed', 'bioentity info'],
    score: Math.max(55, 82 - index * 9),
    url: item.url,
  }))
}

const mapEuropePmc = (payload: EuropePmcSearchResponse): LiteratureCard[] =>
  limit(payload.resultList?.result ?? [], 6).map((item, index) => ({
    id: item.id ?? item.pmid ?? `europepmc-${index + 1}`,
    title: item.title ?? 'Untitled article',
    journal: item.journalTitle ?? 'Unknown journal',
    year: Number(item.pubYear) || new Date().getFullYear(),
    authors: item.authorString
      ? item.authorString.split(',').map((author) => author.trim()).filter(Boolean).slice(0, 4)
      : [],
    snippet: safeSummary(item.abstractText, 'Europe PMC returned metadata without abstract text.'),
    url: item.pmid
      ? `https://europepmc.org/article/MED/${item.pmid}`
      : `https://europepmc.org/search?query=${encodeURIComponent(item.title ?? '')}`,
    source: 'Europe PMC',
    doi: item.doi,
    citedByCount: item.citedByCount,
  }))

const getThaleMineUrl = (geneId: string) =>
  `https://bar.utoronto.ca/thalemine/service/search?q=${encodeURIComponent(geneId)}&format=json`

const fetchThaleMineCandidate = async (query: string) => {
  const payload = await fetchJson<ThaleMineSearchResponse>(getThaleMineUrl(query))
  return payload.results?.[0] ?? null
}

const fetchAtlasInfo = async (geneId: string) =>
  fetchJson<AtlasBioEntityInfo>(
    `https://www.ebi.ac.uk/gxa/json/bioentity-information/${encodeURIComponent(geneId)}`,
  )

const fetchEuropePmc = async (query: string) =>
  fetchJson<EuropePmcSearchResponse>(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=6`,
  )

const makeSourceStatus = (
  source: string,
  label: string,
  status: SourceStatus['status'],
  coverage: SourceStatus['coverage'],
  detail: string,
): SourceStatus => ({
  source,
  label,
  status,
  coverage,
  detail,
  lastChecked: today(),
})

export const resolveSearch = async (
  q: string,
  speciesId: SpeciesId = DEFAULT_SPECIES_ID,
): Promise<SearchResolution> => {
  const query = parseResearchQuery(q, speciesId)

  if (query.type === 'gene') {
    return {
      query,
      candidates: [
        {
          id: query.geneId ?? query.normalized,
          label: query.geneId ?? query.normalized,
          type: 'gene',
          reason: 'AGI-like identifier detected directly from query.',
          source: 'query parser',
        },
      ],
    }
  }

  if (query.type === 'locus' || query.type === 'variant') {
    return { query, candidates: [] }
  }

  if (query.type === 'symbol') {
    const candidates: SearchCandidate[] = []

    try {
      const geneId = await resolveGeneIdFromSymbol(query.geneSymbol ?? query.normalized, speciesId)
      if (geneId) {
        candidates.push({
          id: geneId,
          label: `${query.geneSymbol} -> ${geneId}`,
          type: 'gene',
          reason: 'Resolved by Ensembl xrefs.',
          source: 'Ensembl Plants',
        })
      }
    } catch {
      // Continue with other sources.
    }

    if (speciesId === 'arabidopsis_thaliana') {
      try {
        const thaleMine = await fetchThaleMineCandidate(query.geneSymbol ?? query.normalized)
        const primaryIdentifier = thaleMine?.fields?.primaryIdentifier
        if (primaryIdentifier) {
          candidates.push({
            id: primaryIdentifier,
            label: `${thaleMine?.fields?.symbol ?? primaryIdentifier} -> ${primaryIdentifier}`,
            type: 'gene',
            reason: 'Resolved by BAR ThaleMine search.',
            source: 'BAR ThaleMine',
          })
        }
      } catch {
        // Ignore secondary source failure.
      }
    }

    return { query, candidates }
  }

  return { query, candidates: [] }
}

const buildGeneWorkbench = async (
  geneId: string,
  speciesId: SpeciesId,
): Promise<WorkbenchData> => {
  const species = getSpeciesDefinition(speciesId)
  const liveSourceStatus: SourceStatus[] = []

  try {
    const [gene, orthology, atlasPayload, literaturePayload, thaleMineCandidate] = await Promise.all([
      fetchGeneProfileFromEnsembl(geneId, speciesId),
      fetchOrthologues(geneId, speciesId).catch(() => []),
      fetchAtlasInfo(geneId).catch(() => null),
      fetchEuropePmc(`${geneId} ${species.label}`).catch(() => null),
      speciesId === 'arabidopsis_thaliana' ? fetchThaleMineCandidate(geneId).catch(() => null) : Promise.resolve(null),
    ])

    liveSourceStatus.push(
      makeSourceStatus('ensembl', 'Ensembl Plants REST', 'online', 'full', 'Lookup, overlap и orthology отработали.'),
    )

    if (atlasPayload) {
      liveSourceStatus.push(
        makeSourceStatus('expression-atlas', 'Expression Atlas', 'online', 'partial', 'Bioentity information fetched successfully.'),
      )
    } else {
      liveSourceStatus.push(
        makeSourceStatus('expression-atlas', 'Expression Atlas', 'degraded', 'link-only', 'No structured atlas payload; links remain available.'),
      )
    }

    if (thaleMineCandidate) {
      gene.sourceSummaries.unshift({
        source: 'thalemine',
        label: 'BAR ThaleMine',
        description: safeSummary(
          thaleMineCandidate.fields?.tairCuratorSummary,
          thaleMineCandidate.fields?.tairComputationalDescription,
        ),
        url: `https://bar.utoronto.ca/thalemine/keywordSearchResults.do?searchTerm=${encodeURIComponent(geneId)}`,
      })
      gene.aliases = Array.from(
        new Set([
          ...gene.aliases,
          ...(thaleMineCandidate.fields?.tairAliases?.split(',').map((item) => item.trim()) ?? []),
        ]),
      ).filter(Boolean)
      liveSourceStatus.push(
        makeSourceStatus('thalemine', 'BAR ThaleMine', 'online', 'partial', 'Arabidopsis-specific curated summary resolved.'),
      )
    } else if (speciesId === 'arabidopsis_thaliana') {
      liveSourceStatus.push(
        makeSourceStatus('thalemine', 'BAR ThaleMine', 'degraded', 'link-only', 'ThaleMine search was not available for this query.'),
      )
    }

    if (literaturePayload) {
      liveSourceStatus.push(
        makeSourceStatus('europepmc', 'Europe PMC', 'online', 'full', 'Recent literature cards fetched successfully.'),
      )
    } else {
      liveSourceStatus.push(
        makeSourceStatus('europepmc', 'Europe PMC', 'degraded', 'link-only', 'Literature fallback to external search links only.'),
      )
    }

    liveSourceStatus.push(
      makeSourceStatus('tair', 'TAIR', 'degraded', 'link-only', 'Premium connector not configured in this workspace.'),
    )

    const atlasTerms = atlasPayload ? mapAtlasToFunctionTerms(atlasPayload) : []
    const localVariants = getLocalVariantContext(geneId)

    return {
      query: {
        raw: geneId,
        normalized: geneId,
        type: 'gene',
        speciesId,
        assemblyId: gene.assemblyId,
        geneId,
        geneSymbol: gene.symbol,
      },
      species,
      gene,
      locus: {
        chromosome: gene.location.chromosome,
        start: gene.location.start,
        end: gene.location.end,
        regionLabel: `${gene.location.chromosome}:${gene.location.start}-${gene.location.end}`,
        overlappingGeneIds: [gene.id],
        source: 'Ensembl Plants',
      },
      variants: localVariants,
      expression: atlasPayload ? mapAtlasToExpression(geneId, speciesId, atlasPayload) : null,
      regulation: atlasPayload ? mapAtlasToRegulation(atlasPayload) : [],
      functionTerms: atlasTerms,
      interactions:
        localVariants.length > 0
          ? [
              {
                partnerId: localVariants[0].geneId ?? gene.id,
                partnerLabel: localVariants[0].geneSymbol,
                relation: 'shared uploaded/mock variant context',
                source: 'local research sandbox',
                confidence: 0.64,
              },
            ]
          : [],
      orthology,
      literature: literaturePayload ? mapEuropePmc(literaturePayload) : [],
      supportingLinks: [
        ...gene.externalLinks,
        {
          label: 'Europe PMC search',
          source: 'Europe PMC',
          url: `https://europepmc.org/search?query=${encodeURIComponent(`${geneId} ${species.label}`)}`,
        },
      ],
      sourceStatus: liveSourceStatus,
    }
  } catch {
    return getMockWorkbench(geneId, speciesId)
  }
}

const buildLocusWorkbench = async (
  regionLabel: string,
  speciesId: SpeciesId,
): Promise<WorkbenchData> => {
  try {
    const genes = await fetchGenesForRegion(regionLabel, speciesId)
    const primaryGene = genes[0]

    if (primaryGene?.id) {
      const workbench = await buildGeneWorkbench(primaryGene.id, speciesId)
      return {
        ...workbench,
        query: {
          raw: regionLabel,
          normalized: regionLabel,
          type: 'locus',
          speciesId,
          assemblyId: workbench.gene?.assemblyId ?? workbench.species.defaultAssemblyId,
          geneId: workbench.gene?.id,
          geneSymbol: workbench.gene?.symbol,
          locus: {
            chromosome: regionLabel.split(':')[0],
            start: Number(regionLabel.split(':')[1]?.split('-')[0]),
            end: Number(regionLabel.split('-')[1]),
            regionLabel,
            overlappingGeneIds: genes.map((gene) => gene.id),
            source: 'Ensembl Plants',
          },
        },
        locus: {
          chromosome: regionLabel.split(':')[0],
          start: Number(regionLabel.split(':')[1]?.split('-')[0]),
          end: Number(regionLabel.split('-')[1]),
          regionLabel,
          overlappingGeneIds: genes.map((gene) => gene.id),
          source: 'Ensembl Plants',
        },
        variants: workbench.variants.filter((variant) => {
          const [chromosome, coords] = regionLabel.split(':')
          const [start, end] = coords.split('-').map(Number)
          return (
            variant.chromosome === chromosome.toUpperCase() &&
            variant.position >= start &&
            variant.position <= end
          )
        }),
      }
    }
  } catch {
    // Fall through to mock.
  }

  return getMockWorkbench('AT1G01010', speciesId)
}

const buildVariantWorkbench = async (
  variantLabel: string,
  speciesId: SpeciesId,
): Promise<WorkbenchData> => {
  const match = variantLabel.match(/^([A-Z0-9]+):(\d+)\s+([ACGTN]+)>([ACGTN]+)$/)
  if (!match) {
    return getMockWorkbench('AT1G01010', speciesId)
  }

  try {
    const variant = await annotatePlantVariant({
      chromosome: match[1],
      position: Number(match[2]),
      reference: match[3],
      alternate: match[4],
      speciesId,
    })

    if (variant.geneId) {
      const workbench = await buildGeneWorkbench(variant.geneId, speciesId)
      return {
        ...workbench,
        query: {
          raw: variantLabel,
          normalized: variantLabel,
          type: 'variant',
          speciesId,
          assemblyId: workbench.gene?.assemblyId ?? workbench.species.defaultAssemblyId,
          geneId: workbench.gene?.id,
          geneSymbol: workbench.gene?.symbol,
          variantLabel,
        },
        variants: [variant, ...workbench.variants.filter((item) => item.id !== variant.id)],
      }
    }

    return {
      ...getMockWorkbench('AT1G01010', speciesId),
      query: {
        raw: variantLabel,
        normalized: variantLabel,
        type: 'variant',
        speciesId,
        assemblyId: getSpeciesDefinition(speciesId).defaultAssemblyId,
        variantLabel,
      },
      gene: null,
      variants: [variant],
    }
  } catch {
    return getMockWorkbench('AT1G01010', speciesId)
  }
}

export const buildWorkbenchFromQuery = async (
  raw: string,
  speciesId: SpeciesId = DEFAULT_SPECIES_ID,
) => {
  const resolution = await resolveSearch(raw, speciesId)
  const query = resolution.query

  if (query.type === 'gene' && query.geneId) {
    return buildGeneWorkbench(query.geneId, speciesId)
  }

  if (query.type === 'symbol') {
    const geneId = resolution.candidates[0]?.id
    if (geneId) {
      return buildGeneWorkbench(geneId, speciesId)
    }
  }

  if (query.type === 'locus' && query.locus) {
    return buildLocusWorkbench(query.locus.regionLabel, speciesId)
  }

  if (query.type === 'variant' && query.variantLabel) {
    return buildVariantWorkbench(query.variantLabel, speciesId)
  }

  return getMockWorkbench('AT1G01010', speciesId)
}

export const getSourceStatuses = async (speciesId: SpeciesId = DEFAULT_SPECIES_ID) => {
  const statuses: SourceStatus[] = []

  try {
    await fetchGeneProfileFromEnsembl('AT1G01010', 'arabidopsis_thaliana')
    statuses.push(makeSourceStatus('ensembl', 'Ensembl Plants REST', 'online', 'full', 'Lookup endpoint responded successfully.'))
  } catch {
    statuses.push(makeSourceStatus('ensembl', 'Ensembl Plants REST', 'offline', 'partial', 'Lookup endpoint did not respond in time.'))
  }

  try {
    await fetchThaleMineCandidate('AT1G01010')
    statuses.push(makeSourceStatus('thalemine', 'BAR ThaleMine', 'online', 'partial', 'Search endpoint returned Arabidopsis hits.'))
  } catch {
    statuses.push(makeSourceStatus('thalemine', 'BAR ThaleMine', 'degraded', 'link-only', 'Search endpoint unavailable.'))
  }

  try {
    await fetchAtlasInfo('AT1G01010')
    statuses.push(makeSourceStatus('expression-atlas', 'Expression Atlas', 'online', 'partial', 'Bioentity information endpoint responded.'))
  } catch {
    statuses.push(makeSourceStatus('expression-atlas', 'Expression Atlas', 'degraded', 'link-only', 'Only external atlas links are available.'))
  }

  try {
    await fetchEuropePmc(`AT1G01010 ${getSpeciesDefinition(speciesId).label}`)
    statuses.push(makeSourceStatus('europepmc', 'Europe PMC', 'online', 'full', 'Literature search endpoint responded.'))
  } catch {
    statuses.push(makeSourceStatus('europepmc', 'Europe PMC', 'degraded', 'link-only', 'Europe PMC search unavailable.'))
  }

  statuses.push(makeSourceStatus('tair', 'TAIR', 'degraded', 'link-only', 'Premium connector is optional and disabled by default.'))

  return statuses
}
