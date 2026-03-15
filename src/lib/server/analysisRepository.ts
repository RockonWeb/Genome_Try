import type {
  AnalysisSummary,
  SourceStatus,
  UploadAnalysisResult,
  VariantAnnotation,
  WorkbenchData,
} from '@/types/genome'
import { getDatabase } from '@/lib/server/database'

type AnalysisRow = {
  id: string
  sample_id: string
  file_name: string
  format: AnalysisSummary['format']
  species_id: AnalysisSummary['speciesId']
  assembly_id: AnalysisSummary['assemblyId']
  date: string
  status: AnalysisSummary['status']
  variant_count: number
  high_impact_variants: number
  mean_depth: number
  mean_quality: number
  file_size_mb: number
  focus_gene: string
  insight_count: number
  created_at: string
  updated_at: string
  status_detail: string | null
  pipeline_mode: AnalysisSummary['pipelineMode']
  stored_file_path: string | null
}

type AnalysisPayloadRow = AnalysisRow & {
  variants_json: string
  workbench_json: string | null
}

type SourceCacheRow = {
  cache_key: string
  source: string
  request_url: string
  payload_json: string
  fetched_at: string
  expires_at: string
}

type SourceHealthRow = {
  source: string
  species_id: string
  status_json: string
  checked_at: string
  expires_at: string
}

type MemoryStore = {
  analyses: Map<string, AnalysisSummary>
  payloads: Map<
    string,
    { variants: VariantAnnotation[]; workbench: WorkbenchData | null }
  >
  sourceCache: Map<
    string,
    {
      source: string
      requestUrl: string
      payloadJson: string
      fetchedAt: string
      expiresAt: string
    }
  >
  sourceHealth: Map<
    string,
    Array<{ status: SourceStatus; checkedAt: string; expiresAt: string }>
  >
}

declare global {
  var __phytoscopeMemoryStore: MemoryStore | undefined
  var __phytoscopePersistentStorageAvailable: boolean | undefined
}

const getMemoryStore = (): MemoryStore => {
  if (!globalThis.__phytoscopeMemoryStore) {
    globalThis.__phytoscopeMemoryStore = {
      analyses: new Map(),
      payloads: new Map(),
      sourceCache: new Map(),
      sourceHealth: new Map(),
    }
  }

  return globalThis.__phytoscopeMemoryStore
}

const canUsePersistentStorage = () => {
  if (typeof globalThis.__phytoscopePersistentStorageAvailable === 'boolean') {
    return globalThis.__phytoscopePersistentStorageAvailable
  }

  if (
    process.env.PHYTOSCOPE_FORCE_MEMORY === '1' ||
    process.env.VERCEL === '1'
  ) {
    globalThis.__phytoscopePersistentStorageAvailable = false
    return false
  }

  try {
    getDatabase()
    globalThis.__phytoscopePersistentStorageAvailable = true
    return true
  } catch {
    globalThis.__phytoscopePersistentStorageAvailable = false
    return false
  }
}

const parseJson = <T>(payload: string | null, fallback: T): T => {
  if (!payload) {
    return fallback
  }

  try {
    return JSON.parse(payload) as T
  } catch {
    return fallback
  }
}

const toSummary = (row: AnalysisRow): AnalysisSummary => ({
  id: row.id,
  sampleId: row.sample_id,
  fileName: row.file_name,
  format: row.format,
  speciesId: row.species_id,
  assemblyId: row.assembly_id,
  date: row.date,
  status: row.status,
  variantCount: Number(row.variant_count),
  highImpactVariants: Number(row.high_impact_variants),
  meanDepth: Number(row.mean_depth),
  meanQuality: Number(row.mean_quality),
  fileSizeMb: Number(row.file_size_mb),
  focusGene: row.focus_gene,
  insightCount: Number(row.insight_count),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  statusDetail: row.status_detail,
  pipelineMode: row.pipeline_mode,
  storedFilePath: row.stored_file_path,
})

export const saveAnalysisResult = (result: UploadAnalysisResult) => {
  if (!canUsePersistentStorage()) {
    const store = getMemoryStore()
    store.analyses.set(result.summary.id, result.summary)
    store.payloads.set(result.summary.id, {
      variants: result.variants,
      workbench: result.workbench,
    })
    return
  }

  const db = getDatabase()
  const summary = result.summary
  const saveSummary = db.prepare(`
    INSERT INTO analyses (
      id, sample_id, file_name, format, species_id, assembly_id, date, status,
      variant_count, high_impact_variants, mean_depth, mean_quality, file_size_mb,
      focus_gene, insight_count, created_at, updated_at, status_detail, pipeline_mode, stored_file_path
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      sample_id = excluded.sample_id,
      file_name = excluded.file_name,
      format = excluded.format,
      species_id = excluded.species_id,
      assembly_id = excluded.assembly_id,
      date = excluded.date,
      status = excluded.status,
      variant_count = excluded.variant_count,
      high_impact_variants = excluded.high_impact_variants,
      mean_depth = excluded.mean_depth,
      mean_quality = excluded.mean_quality,
      file_size_mb = excluded.file_size_mb,
      focus_gene = excluded.focus_gene,
      insight_count = excluded.insight_count,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      status_detail = excluded.status_detail,
      pipeline_mode = excluded.pipeline_mode,
      stored_file_path = excluded.stored_file_path
  `)
  const savePayload = db.prepare(`
    INSERT INTO analysis_payloads (analysis_id, variants_json, workbench_json)
    VALUES (?, ?, ?)
    ON CONFLICT(analysis_id) DO UPDATE SET
      variants_json = excluded.variants_json,
      workbench_json = excluded.workbench_json
  `)

  saveSummary.run(
    summary.id,
    summary.sampleId,
    summary.fileName,
    summary.format,
    summary.speciesId,
    summary.assemblyId,
    summary.date,
    summary.status,
    summary.variantCount,
    summary.highImpactVariants,
    summary.meanDepth,
    summary.meanQuality,
    summary.fileSizeMb,
    summary.focusGene,
    summary.insightCount,
    summary.createdAt,
    summary.updatedAt,
    summary.statusDetail,
    summary.pipelineMode,
    summary.storedFilePath,
  )

  savePayload.run(
    summary.id,
    JSON.stringify(result.variants),
    result.workbench ? JSON.stringify(result.workbench) : null,
  )
}

export const listAnalyses = (): AnalysisSummary[] => {
  if (!canUsePersistentStorage()) {
    return Array.from(getMemoryStore().analyses.values()).sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    )
  }

  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM analyses ORDER BY created_at DESC, id DESC')
    .all() as AnalysisRow[]

  return rows.map(toSummary)
}

export const getAnalysisById = (id: string): UploadAnalysisResult | null => {
  if (!canUsePersistentStorage()) {
    const summary = getMemoryStore().analyses.get(id)
    const payload = getMemoryStore().payloads.get(id)

    if (!summary || !payload) {
      return null
    }

    return {
      summary,
      variants: payload.variants,
      workbench: payload.workbench,
    }
  }

  const db = getDatabase()
  const row = db
    .prepare(
      `
      SELECT analyses.*, analysis_payloads.variants_json, analysis_payloads.workbench_json
      FROM analyses
      LEFT JOIN analysis_payloads ON analysis_payloads.analysis_id = analyses.id
      WHERE analyses.id = ?
    `,
    )
    .get(id) as AnalysisPayloadRow | undefined

  if (!row) {
    return null
  }

  return {
    summary: toSummary(row),
    variants: parseJson<VariantAnnotation[]>(row.variants_json, []),
    workbench: parseJson<WorkbenchData | null>(row.workbench_json, null),
  }
}

export const listStoredVariants = () => {
  if (!canUsePersistentStorage()) {
    return Array.from(getMemoryStore().payloads.values()).flatMap(
      (row) => row.variants,
    )
  }

  const db = getDatabase()
  const rows = db
    .prepare('SELECT variants_json FROM analysis_payloads')
    .all() as Array<{ variants_json: string }>

  return rows.flatMap((row) =>
    parseJson<VariantAnnotation[]>(row.variants_json, []),
  )
}

export const getSourceCache = (cacheKey: string) => {
  if (!canUsePersistentStorage()) {
    const row = getMemoryStore().sourceCache.get(cacheKey)
    if (!row) {
      return undefined
    }

    return {
      cache_key: cacheKey,
      source: row.source,
      request_url: row.requestUrl,
      payload_json: row.payloadJson,
      fetched_at: row.fetchedAt,
      expires_at: row.expiresAt,
    } satisfies SourceCacheRow
  }

  const db = getDatabase()
  return db
    .prepare('SELECT * FROM source_cache WHERE cache_key = ?')
    .get(cacheKey) as SourceCacheRow | undefined
}

export const saveSourceCache = (input: {
  cacheKey: string
  source: string
  requestUrl: string
  payloadJson: string
  fetchedAt: string
  expiresAt: string
}) => {
  if (!canUsePersistentStorage()) {
    getMemoryStore().sourceCache.set(input.cacheKey, {
      source: input.source,
      requestUrl: input.requestUrl,
      payloadJson: input.payloadJson,
      fetchedAt: input.fetchedAt,
      expiresAt: input.expiresAt,
    })
    return
  }

  const db = getDatabase()
  db.prepare(
    `
    INSERT INTO source_cache (cache_key, source, request_url, payload_json, fetched_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET
      source = excluded.source,
      request_url = excluded.request_url,
      payload_json = excluded.payload_json,
      fetched_at = excluded.fetched_at,
      expires_at = excluded.expires_at
  `,
  ).run(
    input.cacheKey,
    input.source,
    input.requestUrl,
    input.payloadJson,
    input.fetchedAt,
    input.expiresAt,
  )
}

export const readSourceCachePayload = <T>(cacheKey: string) => {
  const row = getSourceCache(cacheKey)
  if (!row) {
    return null
  }

  return {
    source: row.source,
    requestUrl: row.request_url,
    payload: parseJson<T>(row.payload_json, null as T),
    fetchedAt: row.fetched_at,
    expiresAt: row.expires_at,
  }
}

export const getSourceHealthSnapshots = (speciesId: string) => {
  if (!canUsePersistentStorage()) {
    return (getMemoryStore().sourceHealth.get(speciesId) ?? []).map((row) => ({
      source: row.status.source,
      species_id: speciesId,
      status_json: JSON.stringify(row.status),
      checked_at: row.checkedAt,
      expires_at: row.expiresAt,
    }))
  }

  const db = getDatabase()
  return db
    .prepare('SELECT * FROM source_health_checks WHERE species_id = ?')
    .all(speciesId) as SourceHealthRow[]
}

export const saveSourceHealthStatuses = (
  speciesId: string,
  statuses: SourceStatus[],
  expiresAt: string,
) => {
  if (!canUsePersistentStorage()) {
    getMemoryStore().sourceHealth.set(
      speciesId,
      statuses.map((status) => ({
        status,
        checkedAt: status.lastChecked,
        expiresAt,
      })),
    )
    return
  }

  const db = getDatabase()
  const statement = db.prepare(`
    INSERT INTO source_health_checks (source, species_id, status_json, checked_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(source, species_id) DO UPDATE SET
      status_json = excluded.status_json,
      checked_at = excluded.checked_at,
      expires_at = excluded.expires_at
  `)

  for (const status of statuses) {
    statement.run(
      status.source,
      speciesId,
      JSON.stringify(status),
      status.lastChecked,
      expiresAt,
    )
  }
}

export const readSourceHealthStatuses = (speciesId: string) => {
  const rows = getSourceHealthSnapshots(speciesId)

  return rows.map((row) => ({
    status: parseJson<SourceStatus>(row.status_json, {
      source: row.source,
      label: row.source,
      status: 'offline',
      coverage: 'link-only',
      detail: 'Saved health snapshot could not be parsed.',
      lastChecked: row.checked_at,
      observedVia: 'cache',
    }),
    checkedAt: row.checked_at,
    expiresAt: row.expires_at,
  }))
}
