import { NextResponse } from 'next/server'
import { DEFAULT_SPECIES_ID, SPECIES_OPTIONS } from '@/lib/constants'
import { buildWorkbenchFromQuery } from '@/lib/researchAggregator'

const isSpecies = (value: string): value is (typeof SPECIES_OPTIONS)[number]['id'] =>
  SPECIES_OPTIONS.some((species) => species.id === value)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gene = searchParams.get('gene')?.trim()
  const species = searchParams.get('species') ?? DEFAULT_SPECIES_ID

  if (!gene) {
    return NextResponse.json({ message: 'gene query parameter is required.' }, { status: 400 })
  }

  const speciesId = isSpecies(species) ? species : DEFAULT_SPECIES_ID

  try {
    const workbench = await buildWorkbenchFromQuery(gene, speciesId)
    return NextResponse.json({
      gene,
      speciesId,
      literature: workbench.literature,
    })
  } catch {
    return NextResponse.json(
      { message: 'Не удалось загрузить literature cards.' },
      { status: 500 },
    )
  }
}
