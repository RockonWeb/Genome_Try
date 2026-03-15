import { getSpeciesDefinition } from '@/lib/constants'
import type { ResearchQuery, SearchResolution, SpeciesId } from '@/types/genome'

const agiPattern = /^AT[1-5CM]G\d{5}(?:\.\d+)?$/i
const locusPattern = /^(?:chr)?([A-Za-z0-9]+):(\d+)-(\d+)$/i
const variantPattern =
  /^(?:chr)?([A-Za-z0-9]+):(\d+)\s+([ACGTN]+)>([ACGTN]+)$/i

export const parseResearchQuery = (
  raw: string,
  speciesId: SpeciesId,
): ResearchQuery => {
  const trimmed = raw.trim()
  const species = getSpeciesDefinition(speciesId)

  if (!trimmed) {
    return {
      raw,
      normalized: '',
      type: 'unknown',
      speciesId,
      assemblyId: species.defaultAssemblyId,
    }
  }

  const locusMatch = trimmed.match(locusPattern)
  if (locusMatch) {
    const chromosome = locusMatch[1].toUpperCase()
    const start = Number(locusMatch[2])
    const end = Number(locusMatch[3])

    return {
      raw,
      normalized: `${chromosome}:${start}-${end}`,
      type: 'locus',
      speciesId,
      assemblyId: species.defaultAssemblyId,
      locus: {
        chromosome,
        start,
        end,
        regionLabel: `${chromosome}:${start}-${end}`,
        overlappingGeneIds: [],
        source: 'query parser',
      },
    }
  }

  const variantMatch = trimmed.match(variantPattern)
  if (variantMatch) {
    const chromosome = variantMatch[1].toUpperCase()
    const position = Number(variantMatch[2])
    const reference = variantMatch[3].toUpperCase()
    const alternate = variantMatch[4].toUpperCase()

    return {
      raw,
      normalized: `${chromosome}:${position} ${reference}>${alternate}`,
      type: 'variant',
      speciesId,
      assemblyId: species.defaultAssemblyId,
      variantLabel: `${chromosome}:${position} ${reference}>${alternate}`,
      locus: {
        chromosome,
        start: position,
        end: position,
        regionLabel: `${chromosome}:${position}-${position}`,
        overlappingGeneIds: [],
        source: 'query parser',
      },
    }
  }

  if (agiPattern.test(trimmed)) {
    return {
      raw,
      normalized: trimmed.toUpperCase(),
      type: 'gene',
      speciesId,
      assemblyId: species.defaultAssemblyId,
      geneId: trimmed.toUpperCase().replace(/\.\d+$/, ''),
    }
  }

  return {
    raw,
    normalized: trimmed.toUpperCase(),
    type: 'symbol',
    speciesId,
    assemblyId: species.defaultAssemblyId,
    geneSymbol: trimmed.toUpperCase(),
  }
}

export const createInitialResolution = (
  raw: string,
  speciesId: SpeciesId,
): SearchResolution => ({
  query: parseResearchQuery(raw, speciesId),
  candidates: [],
})
