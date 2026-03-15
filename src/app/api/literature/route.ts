import { NextResponse } from 'next/server'
import { DEFAULT_SPECIES_ID, SPECIES_OPTIONS } from '@/lib/constants'
import {
  getDefaultLiteratureFilters,
  normalizeLiteratureSort,
  searchLiterature,
} from '@/lib/literature'

const isSpecies = (
  value: string,
): value is (typeof SPECIES_OPTIONS)[number]['id'] =>
  SPECIES_OPTIONS.some((species) => species.id === value)

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query =
    searchParams.get('q')?.trim() || searchParams.get('gene')?.trim() || ''
  const species = searchParams.get('species') ?? DEFAULT_SPECIES_ID
  const yearFrom = Number(searchParams.get('yearFrom'))
  const sort = normalizeLiteratureSort(searchParams.get('sort'))
  const source =
    searchParams.get('source') === 'Europe PMC' ? 'Europe PMC' : 'Europe PMC'
  const refresh = searchParams.get('refresh') === '1'

  if (!query) {
    return NextResponse.json(
      { message: 'Необходимо передать параметр q или gene.' },
      { status: 400 },
    )
  }

  const speciesId = isSpecies(species) ? species : DEFAULT_SPECIES_ID

  try {
    const defaults = getDefaultLiteratureFilters()

    return NextResponse.json(
      await searchLiterature({
        query,
        speciesId,
        filters: {
          yearFrom: Number.isFinite(yearFrom) ? yearFrom : defaults.yearFrom,
          sort,
          source,
          refresh,
        },
      }),
    )
  } catch {
    return NextResponse.json(
      { message: 'Не удалось загрузить карточки литературы.' },
      { status: 500 },
    )
  }
}
