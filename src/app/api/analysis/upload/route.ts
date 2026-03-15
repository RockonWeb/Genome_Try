import { NextResponse } from 'next/server'
import { z } from 'zod'
import { DEFAULT_SPECIES_ID, getSpeciesDefinition, SPECIES_OPTIONS } from '@/lib/constants'
import {
  annotateVcfWithEnsembl,
  supportsPlantAnnotation,
  VcfAnnotationInputError,
} from '@/lib/ensembl'
import { buildWorkbenchFromQuery } from '@/lib/researchAggregator'
import { createUploadedAnalysis } from '@/lib/mockData'
import type { AssemblyId } from '@/types/genome'

const requestSchema = z.object({
  speciesId: z.enum(
    SPECIES_OPTIONS.map((species) => species.id) as [
      (typeof SPECIES_OPTIONS)[number]['id'],
      ...(typeof SPECIES_OPTIONS)[number]['id'][],
    ],
  ),
  assemblyId: z.string().min(1),
})

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const validation = requestSchema.safeParse({
      speciesId: formData.get('speciesId') ?? DEFAULT_SPECIES_ID,
      assemblyId: formData.get('assemblyId') ?? getSpeciesDefinition(DEFAULT_SPECIES_ID).defaultAssemblyId,
    })

    if (!(file instanceof File) || !validation.success) {
      return NextResponse.json(
        { message: 'Нужны файл, speciesId и assemblyId.' },
        { status: 400 },
      )
    }

    const { speciesId, assemblyId } = validation.data
    const speciesDefinition = getSpeciesDefinition(speciesId)

    if (!speciesDefinition.assemblies.some((assembly) => assembly.id === assemblyId)) {
      return NextResponse.json(
        { message: 'Assembly does not belong to selected species.' },
        { status: 400 },
      )
    }
    const normalizedAssemblyId = assemblyId as AssemblyId

    if (!supportsPlantAnnotation(file.name)) {
      return NextResponse.json(createUploadedAnalysis(file, speciesId, normalizedAssemblyId))
    }

    try {
      const result = await annotateVcfWithEnsembl(await file.text(), {
        fileName: file.name,
        fileSize: file.size,
        speciesId,
          assemblyId: normalizedAssemblyId,
      })
      const focusGene = result.variants.find((variant) => variant.geneId)?.geneId
      const workbench = focusGene
        ? await buildWorkbenchFromQuery(focusGene, speciesId).catch(() => null)
        : null

      return NextResponse.json({
        ...result,
        workbench,
      })
    } catch (error) {
      if (error instanceof VcfAnnotationInputError) {
        return NextResponse.json({ message: error.message }, { status: 400 })
      }

      return NextResponse.json(createUploadedAnalysis(file, speciesId, normalizedAssemblyId))
    }
  } catch {
    return NextResponse.json(
      { message: 'Не удалось обработать файл и подготовить plant analysis.' },
      { status: 500 },
    )
  }
}
