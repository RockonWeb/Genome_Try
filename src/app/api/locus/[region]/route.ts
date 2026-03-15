import { NextResponse } from 'next/server'
import { DEFAULT_SPECIES_ID, SPECIES_OPTIONS } from '@/lib/constants'
import { buildWorkbenchFromQuery } from '@/lib/researchAggregator'

const isSpecies = (
  value: string,
): value is (typeof SPECIES_OPTIONS)[number]['id'] =>
  SPECIES_OPTIONS.some((species) => species.id === value)

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ region: string }> },
) {
  const resolvedParams = await params
  const { searchParams } = new URL(request.url)
  const species = searchParams.get('species') ?? DEFAULT_SPECIES_ID
  const speciesId = isSpecies(species) ? species : DEFAULT_SPECIES_ID

  try {
    return NextResponse.json(
      await buildWorkbenchFromQuery(
        decodeURIComponent(resolvedParams.region),
        speciesId,
      ),
    )
  } catch {
    return NextResponse.json(
      { message: 'Не удалось собрать рабочую область по локусу.' },
      { status: 500 },
    )
  }
}
