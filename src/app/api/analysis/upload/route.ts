import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  DEFAULT_SPECIES_ID,
  getSpeciesDefinition,
  SPECIES_OPTIONS,
} from '@/lib/constants'
import {
  annotateVcfWithEnsembl,
  supportsPlantAnnotation,
  VcfAnnotationInputError,
} from '@/lib/ensembl'
import { buildWorkbenchFromQuery } from '@/lib/researchAggregator'
import {
  writeAnalysisArtifacts,
  saveUploadedFile,
} from '@/lib/server/analysisFiles'
import {
  createAnalysisId,
  createAnalysisResult,
} from '@/lib/server/analysisFactory'
import { saveAnalysisResult } from '@/lib/server/analysisRepository'
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

const enrichAndPersistResult = async (
  result: Awaited<ReturnType<typeof annotateVcfWithEnsembl>>,
  file: File,
) => {
  const storedFile = await saveUploadedFile(result.summary.id, file)
  const persistedResult = {
    ...result,
    summary: {
      ...result.summary,
      storedFilePath: storedFile.workspacePath,
      updatedAt: new Date().toISOString(),
    },
  }

  saveAnalysisResult(persistedResult)
  await writeAnalysisArtifacts(persistedResult)

  return persistedResult
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const validation = requestSchema.safeParse({
      speciesId: formData.get('speciesId') ?? DEFAULT_SPECIES_ID,
      assemblyId:
        formData.get('assemblyId') ??
        getSpeciesDefinition(DEFAULT_SPECIES_ID).defaultAssemblyId,
    })

    if (!(file instanceof File) || !validation.success) {
      return NextResponse.json(
        { message: 'Нужно передать файл, вид и сборку.' },
        { status: 400 },
      )
    }

    const { speciesId, assemblyId } = validation.data
    const speciesDefinition = getSpeciesDefinition(speciesId)

    if (
      !speciesDefinition.assemblies.some(
        (assembly) => assembly.id === assemblyId,
      )
    ) {
      return NextResponse.json(
        { message: 'Выбранная сборка не относится к указанному виду.' },
        { status: 400 },
      )
    }
    const normalizedAssemblyId = assemblyId as AssemblyId

    if (!supportsPlantAnnotation(file.name)) {
      const queuedResult = createAnalysisResult({
        id: createAnalysisId(speciesId),
        fileName: file.name,
        fileSize: file.size,
        speciesId,
        assemblyId: normalizedAssemblyId,
        status: 'queued',
        pipelineMode: 'deferred_backend',
        variants: [],
        workbench: null,
        statusDetail:
          'Полный вычислительный конвейер для BAM, FASTA и BED в этом рабочем пространстве пока не подключён. Запуск сохранён в режиме очереди.',
      })

      return NextResponse.json(await enrichAndPersistResult(queuedResult, file))
    }

    try {
      const result = await annotateVcfWithEnsembl(await file.text(), {
        fileName: file.name,
        fileSize: file.size,
        speciesId,
        assemblyId: normalizedAssemblyId,
      })
      const focusGene = result.variants.find(
        (variant) => variant.geneId,
      )?.geneId
      const workbench = focusGene
        ? await buildWorkbenchFromQuery(focusGene, speciesId).catch(() => null)
        : null

      return NextResponse.json(
        await enrichAndPersistResult(
          {
            ...result,
            workbench,
          },
          file,
        ),
      )
    } catch (error) {
      if (error instanceof VcfAnnotationInputError) {
        return NextResponse.json({ message: error.message }, { status: 400 })
      }

      const failedResult = createAnalysisResult({
        id: createAnalysisId(speciesId),
        fileName: file.name,
        fileSize: file.size,
        speciesId,
        assemblyId: normalizedAssemblyId,
        status: 'failed',
        pipelineMode: 'vcf_live',
        variants: [],
        workbench: null,
        statusDetail:
          error instanceof Error
            ? error.message
            : 'Анализ VCF завершился с ошибкой до того, как удалось собрать рабочую область.',
      })

      return NextResponse.json(await enrichAndPersistResult(failedResult, file))
    }
  } catch {
    return NextResponse.json(
      { message: 'Не удалось обработать файл и подготовить plant analysis.' },
      { status: 500 },
    )
  }
}
