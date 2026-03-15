import { NextResponse } from 'next/server'
import { z } from 'zod'
import { DEFAULT_SPECIES_ID, SPECIES_OPTIONS } from '@/lib/constants'
import { buildWorkbenchFromQuery } from '@/lib/researchAggregator'

const bodySchema = z.object({
  chromosome: z.string().min(1),
  position: z.number().int().positive(),
  reference: z.string().min(1),
  alternate: z.string().min(1),
  speciesId: z
    .enum(
      SPECIES_OPTIONS.map((species) => species.id) as [
        (typeof SPECIES_OPTIONS)[number]['id'],
        ...(typeof SPECIES_OPTIONS)[number]['id'][],
      ],
    )
    .optional(),
})

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))

  if (!parsed.success) {
    return NextResponse.json({ message: 'Invalid variant payload.' }, { status: 400 })
  }

  const body = parsed.data
  const variantLabel = `${body.chromosome}:${body.position} ${body.reference}>${body.alternate}`

  try {
    return NextResponse.json(
      await buildWorkbenchFromQuery(variantLabel, body.speciesId ?? DEFAULT_SPECIES_ID),
    )
  } catch {
    return NextResponse.json(
      { message: 'Не удалось аннотировать variant query.' },
      { status: 500 },
    )
  }
}
