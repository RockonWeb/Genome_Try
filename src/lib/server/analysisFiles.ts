import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { UploadAnalysisResult } from '@/types/genome'
import { getPhytoStoragePaths } from '@/lib/server/storagePaths'

const getFileExtension = (fileName: string) => {
  const extension = path.extname(fileName)
  return extension || '.dat'
}

export const saveUploadedFile = async (analysisId: string, file: File) => {
  const paths = getPhytoStoragePaths()
  const uploadDirectory = path.join(paths.uploadsDir, analysisId)
  const storedAbsolutePath = path.join(uploadDirectory, `original${getFileExtension(file.name)}`)

  await mkdir(uploadDirectory, { recursive: true })
  await writeFile(storedAbsolutePath, Buffer.from(await file.arrayBuffer()))

  return {
    absolutePath: storedAbsolutePath,
    workspacePath: paths.toWorkspaceRelative(storedAbsolutePath),
  }
}

export const writeAnalysisArtifacts = async (result: UploadAnalysisResult) => {
  const paths = getPhytoStoragePaths()
  const artifactDirectory = path.join(paths.artifactsDir, result.summary.id)
  await mkdir(artifactDirectory, { recursive: true })

  await Promise.all([
    writeFile(
      path.join(artifactDirectory, 'summary.json'),
      JSON.stringify(result.summary, null, 2),
      'utf8',
    ),
    writeFile(
      path.join(artifactDirectory, 'variants.json'),
      JSON.stringify(result.variants, null, 2),
      'utf8',
    ),
    writeFile(
      path.join(artifactDirectory, 'workbench.json'),
      JSON.stringify(result.workbench, null, 2),
      'utf8',
    ),
  ])
}
