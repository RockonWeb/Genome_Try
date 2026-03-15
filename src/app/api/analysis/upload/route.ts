import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  annotateVcfWithEnsembl,
  supportsEnsemblAnnotation,
  VcfAnnotationInputError,
} from '@/lib/ensembl'
import { createUploadedAnalysis } from '@/lib/mockData'

const requestSchema = z.object({
  genomeBuild: z.enum(['hg38', 'hg19', 't2t']),
})

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const validation = requestSchema.safeParse({
      genomeBuild: formData.get('genomeBuild'),
    })

    if (!(file instanceof File) || !validation.success) {
      return NextResponse.json(
        { message: 'Нужны файл и корректная сборка генома.' },
        { status: 400 },
      )
    }

    const genomeBuild = validation.data.genomeBuild

    if (!supportsEnsemblAnnotation(file.name, genomeBuild)) {
      return NextResponse.json(createUploadedAnalysis(file, genomeBuild))
    }

    try {
      const result = await annotateVcfWithEnsembl(await file.text(), {
        fileName: file.name,
        fileSize: file.size,
        genomeBuild,
      })

      return NextResponse.json(result)
    } catch (error) {
      if (error instanceof VcfAnnotationInputError) {
        return NextResponse.json({ message: error.message }, { status: 400 })
      }

      return NextResponse.json(createUploadedAnalysis(file, genomeBuild))
    }
  } catch {
    return NextResponse.json(
      { message: 'Не удалось обработать файл и подготовить анализ.' },
      { status: 500 },
    )
  }
}
