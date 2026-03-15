import { NextResponse } from 'next/server'
import { DEFAULT_SPECIES_ID, SPECIES_OPTIONS } from '@/lib/constants'
import { getSourceStatuses } from '@/lib/sourceHealth'

const isSpecies = (value: string): value is (typeof SPECIES_OPTIONS)[number]['id'] =>
  SPECIES_OPTIONS.some((species) => species.id === value)

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const species = searchParams.get('species') ?? DEFAULT_SPECIES_ID
  const refresh = searchParams.get('refresh') === '1'
  const speciesId = isSpecies(species) ? species : DEFAULT_SPECIES_ID

  try {
    return NextResponse.json(await getSourceStatuses(speciesId, { refresh }))
  } catch {
    return NextResponse.json(
      { message: 'Не удалось получить source status.' },
      { status: 500 },
    )
  }
}
