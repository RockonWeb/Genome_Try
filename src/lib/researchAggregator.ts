import { DEFAULT_SPECIES_ID, getSpeciesDefinition } from '@/lib/constants'
import {
  annotatePlantVariant,
  fetchGeneProfileFromEnsembl,
  fetchGenesForRegion,
  fetchOrthologues,
  getLocalVariantContext,
  resolveGeneIdFromSymbol,
} from '@/lib/ensembl'
import {
  getDefaultLiteratureFilters,
  searchLiterature,
} from '@/lib/literature'
import { fetchCachedJson } from '@/lib/server/sourceCache'
import { getSourceStatuses } from '@/lib/sourceHealth'
import { parseResearchQuery } from '@/lib/query'
import type {
  ExpressionProfile,
  FunctionTerm,
  RegulationEvidence,
  SearchCandidate,
  SearchResolution,
  SourceStatus,
  SpeciesId,
  VariantAnnotation,
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

const THALEMINE_TTL_MS = 24 * 60 * 60 * 1000
const ATLAS_TTL_MS = 24 * 60 * 60 * 1000

const today = () => new Date().toISOString()

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
    lastUpdated: today().slice(0, 10),
  }
}

const mapAtlasToRegulation = (payload: AtlasBioEntityInfo): RegulationEvidence[] => {
  const goTerms = (payload.bioentityProperties ?? []).find((item) => item.type === 'go')

  return limit(goTerms?.values ?? [], 3).map((item, index) => ({
    title: item.text,
    summary: 'Ontology-backed evidence term from Expression Atlas bioentity information.',
    evidenceType: 'computational',
    source: 'Expression Atlas',
    tags: ['GO-backed', 'bioentity info'],
    score: Math.max(55, 82 - index * 9),
    url: item.url,
  }))
}

const getThaleMineUrl = (geneId: string) =>
  `https://bar.utoronto.ca/thalemine/service/search?q=${encodeURIComponent(geneId)}&format=json`

const fetchThaleMineCandidate = async (query: string) => {
  const { payload } = await fetchCachedJson<ThaleMineSearchResponse>({
    source: 'thalemine',
    url: getThaleMineUrl(query),
    ttlMs: THALEMINE_TTL_MS,
  })

  return payload.results?.[0] ?? null
}

const fetchAtlasInfo = async (geneId: string) => {
  const { payload } = await fetchCachedJson<AtlasBioEntityInfo>({
    source: 'expression-atlas',
    url: `https://www.ebi.ac.uk/gxa/json/bioentity-information/${encodeURIComponent(geneId)}`,
    ttlMs: ATLAS_TTL_MS,
  })

  return payload
}

const createEmptyWorkbench = async ({
  raw,
  speciesId,
  sourceStatus,
  variants,
}: {
  raw: string
  speciesId: SpeciesId
  sourceStatus?: SourceStatus[]
  variants?: VariantAnnotation[]
}): Promise<WorkbenchData> => {
  const query = parseResearchQuery(raw, speciesId)
  return {
    query,
    species: getSpeciesDefinition(speciesId),
    gene: null,
    locus: query.locus ?? null,
    variants: variants ?? [],
    expression: null,
    regulation: [],
    functionTerms: [],
    interactions: [],
    orthology: [],
    literature: [],
    supportingLinks: [],
    sourceStatus: sourceStatus ?? [],
  }
}

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
      // Ensembl is optional here; keep looking for other evidence.
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
        // Secondary source failure should not break resolution.
      }
    }

    return {
      query,
      candidates: Array.from(new Map(candidates.map((candidate) => [candidate.id, candidate])).values()),
    }
  }

  return { query, candidates: [] }
}

const buildGeneWorkbench = async (
  geneId: string,
  speciesId: SpeciesId,
): Promise<WorkbenchData> => {
  const sourceStatus = await getSourceStatuses(speciesId).catch(() => [])
  const species = getSpeciesDefinition(speciesId)

  let gene
  try {
    gene = await fetchGeneProfileFromEnsembl(geneId, speciesId)
  } catch {
    return createEmptyWorkbench({
      raw: geneId,
      speciesId,
      sourceStatus,
    })
  }

  const [orthology, atlasPayload, literatureResult, thaleMineCandidate] = await Promise.all([
    fetchOrthologues(geneId, speciesId).catch(() => []),
    fetchAtlasInfo(geneId).catch(() => null),
    searchLiterature({
      query: geneId,
      speciesId,
      filters: {
        ...getDefaultLiteratureFilters(),
        refresh: false,
      },
    }).catch(() => null),
    speciesId === 'arabidopsis_thaliana'
      ? fetchThaleMineCandidate(geneId).catch(() => null)
      : Promise.resolve(null),
  ])

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
  }

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
    functionTerms: atlasPayload ? mapAtlasToFunctionTerms(atlasPayload) : [],
    interactions:
      localVariants.length > 0
        ? [
            {
              partnerId: localVariants[0].geneId ?? gene.id,
              partnerLabel: localVariants[0].geneSymbol,
              relation: 'shared uploaded variant context across persisted runs',
              source: 'local persisted analyses',
              confidence: 0.64,
            },
          ]
        : [],
    orthology,
    literature: literatureResult?.items.slice(0, 6) ?? [],
    supportingLinks: [
      ...gene.externalLinks,
      {
        label: 'Europe PMC search',
        source: 'Europe PMC',
        url: `https://europepmc.org/search?query=${encodeURIComponent(`${geneId} ${species.label}`)}`,
      },
    ],
    sourceStatus,
  }
}

const buildLocusWorkbench = async (
  regionLabel: string,
  speciesId: SpeciesId,
): Promise<WorkbenchData> => {
  const sourceStatus = await getSourceStatuses(speciesId).catch(() => [])

  try {
    const genes = await fetchGenesForRegion(regionLabel, speciesId)
    const primaryGene = genes[0]

    if (primaryGene?.id) {
      const workbench = await buildGeneWorkbench(primaryGene.id, speciesId)
      const [chromosome, coords] = regionLabel.split(':')
      const [start, end] = coords.split('-').map(Number)

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
            chromosome,
            start,
            end,
            regionLabel,
            overlappingGeneIds: genes.map((gene) => gene.id),
            source: 'Ensembl Plants',
          },
        },
        locus: {
          chromosome,
          start,
          end,
          regionLabel,
          overlappingGeneIds: genes.map((gene) => gene.id),
          source: 'Ensembl Plants',
        },
        variants: workbench.variants.filter(
          (variant) =>
            variant.chromosome === chromosome.toUpperCase() &&
            variant.position >= start &&
            variant.position <= end,
        ),
        sourceStatus,
      }
    }
  } catch {
    // Fall back to an empty locus workbench.
  }

  return createEmptyWorkbench({
    raw: regionLabel,
    speciesId,
    sourceStatus,
  })
}

const buildVariantWorkbench = async (
  variantLabel: string,
  speciesId: SpeciesId,
): Promise<WorkbenchData> => {
  const sourceStatus = await getSourceStatuses(speciesId).catch(() => [])
  const match = variantLabel.match(/^([A-Z0-9]+):(\d+)\s+([ACGTN]+)>([ACGTN]+)$/)
  if (!match) {
    return createEmptyWorkbench({
      raw: variantLabel,
      speciesId,
      sourceStatus,
    })
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
        sourceStatus,
      }
    }

    return createEmptyWorkbench({
      raw: variantLabel,
      speciesId,
      sourceStatus,
      variants: [variant],
    })
  } catch {
    return createEmptyWorkbench({
      raw: variantLabel,
      speciesId,
      sourceStatus,
    })
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

  return createEmptyWorkbench({
    raw,
    speciesId,
    sourceStatus: await getSourceStatuses(speciesId).catch(() => []),
  })
}

export { getSourceStatuses }
