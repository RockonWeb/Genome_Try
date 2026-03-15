import { NextResponse } from 'next/server'
import { DEFAULT_SPECIES_ID, SPECIES_OPTIONS } from '@/lib/constants'
import { buildWorkbenchFromQuery } from '@/lib/researchAggregator'

const isSpecies = (value: string): value is (typeof SPECIES_OPTIONS)[number]['id'] =>
  SPECIES_OPTIONS.some((species) => species.id === value)

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params
  const { searchParams } = new URL(request.url)
  const species = searchParams.get('species') ?? DEFAULT_SPECIES_ID
  const speciesId = isSpecies(species) ? species : DEFAULT_SPECIES_ID

  try {
    return NextResponse.json(
      await buildWorkbenchFromQuery(resolvedParams.id, speciesId),
    )
  } catch {
    return NextResponse.json(
      { message: 'Не удалось собрать gene workbench.' },
      { status: 500 },
    )
  }
}
