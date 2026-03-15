import path from 'node:path'

const toWorkspaceRelative = (absolutePath: string) => {
  const relativePath = path.relative(process.cwd(), absolutePath)

  if (!relativePath || relativePath.includes(':')) {
    return absolutePath.replaceAll('\\', '/')
  }

  const normalizedPath = relativePath.replaceAll('\\', '/')
  return normalizedPath.startsWith('.') ? normalizedPath : `./${normalizedPath}`
}

export const getPhytoStoragePaths = () => {
  const configuredDataDir = process.env.PHYTOSCOPE_DATA_DIR?.trim()
  const dataDir = configuredDataDir
    ? path.resolve(process.cwd(), configuredDataDir)
    : path.join(process.cwd(), '.phyto')

  return {
    dataDir,
    dbPath: path.join(dataDir, 'phyto.db'),
    uploadsDir: path.join(dataDir, 'uploads'),
    artifactsDir: path.join(dataDir, 'artifacts'),
    toWorkspaceRelative,
  }
}
