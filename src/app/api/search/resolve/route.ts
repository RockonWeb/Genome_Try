import { NextResponse } from 'next/server'
import { DEFAULT_SPECIES_ID, SPECIES_OPTIONS } from '@/lib/constants'
import {
  buildWorkbenchFromQuery,
  resolveSearch,
} from '@/lib/researchAggregator'

const isSpecies = (
  value: string,
): value is (typeof SPECIES_OPTIONS)[number]['id'] =>
  SPECIES_OPTIONS.some((species) => species.id === value)

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const species = searchParams.get('species') ?? DEFAULT_SPECIES_ID
  const hydrate = searchParams.get('hydrate') === '1'

  if (!query) {
    return NextResponse.json(
      { message: 'Необходимо передать параметр q.' },
      { status: 400 },
    )
  }

  const speciesId = isSpecies(species) ? species : DEFAULT_SPECIES_ID

  try {
    if (hydrate) {
      return NextResponse.json(await buildWorkbenchFromQuery(query, speciesId))
    }

    return NextResponse.json(await resolveSearch(query, speciesId))
  } catch {
    return NextResponse.json(
      { message: 'Не удалось разрешить поисковый запрос.' },
      { status: 500 },
    )
  }
}
