import { DEFAULT_SPECIES_ID } from '@/lib/constants'
import type {
  SearchResolution,
  SourceStatus,
  SpeciesId,
  WorkbenchData,
} from '@/types/genome'

const readJson = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as T | { message?: string }

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? payload.message
        : 'Request failed'
    throw new Error(message || 'Request failed')
  }

  return payload as T
}

export const researchApi = {
  async resolve(query: string, speciesId: SpeciesId = DEFAULT_SPECIES_ID) {
    const response = await fetch(
      `/api/search/resolve?q=${encodeURIComponent(query)}&species=${encodeURIComponent(speciesId)}`,
      { cache: 'no-store' },
    )

    return readJson<SearchResolution>(response)
  },

  async getWorkbench(query: string, speciesId: SpeciesId = DEFAULT_SPECIES_ID) {
    const response = await fetch(
      `/api/search/resolve?q=${encodeURIComponent(query)}&species=${encodeURIComponent(speciesId)}&hydrate=1`,
      { cache: 'no-store' },
    )

    return readJson<WorkbenchData>(response)
  },

  async getGene(geneId: string, speciesId: SpeciesId = DEFAULT_SPECIES_ID) {
    const response = await fetch(
      `/api/gene/${encodeURIComponent(geneId)}?species=${encodeURIComponent(speciesId)}`,
      { cache: 'no-store' },
    )

    return readJson<WorkbenchData>(response)
  },

  async getLocus(
    regionLabel: string,
    speciesId: SpeciesId = DEFAULT_SPECIES_ID,
  ) {
    const response = await fetch(
      `/api/locus/${encodeURIComponent(regionLabel)}?species=${encodeURIComponent(speciesId)}`,
      { cache: 'no-store' },
    )

    return readJson<WorkbenchData>(response)
  },

  async annotateVariant(payload: {
    chromosome: string
    position: number
    reference: string
    alternate: string
    speciesId?: SpeciesId
  }) {
    const response = await fetch('/api/variant/annotate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    return readJson<WorkbenchData>(response)
  },

  async getLiterature(gene: string, speciesId: SpeciesId = DEFAULT_SPECIES_ID) {
    const response = await fetch(
      `/api/literature?gene=${encodeURIComponent(gene)}&species=${encodeURIComponent(speciesId)}`,
      { cache: 'no-store' },
    )

    return readJson<{
      gene: string
      speciesId: SpeciesId
      literature: WorkbenchData['literature']
    }>(response)
  },

  async getSourceStatus(speciesId: SpeciesId = DEFAULT_SPECIES_ID) {
    const response = await fetch(
      `/api/source-status?species=${encodeURIComponent(speciesId)}`,
      { cache: 'no-store' },
    )

    return readJson<SourceStatus[]>(response)
  },
}
