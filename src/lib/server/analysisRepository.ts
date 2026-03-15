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

const parseJson = <T,>(payload: string | null, fallback: T): T => {
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
  const db = getDatabase()
  const rows = db
    .prepare('SELECT * FROM analyses ORDER BY created_at DESC, id DESC')
    .all() as AnalysisRow[]

  return rows.map(toSummary)
}

export const getAnalysisById = (id: string): UploadAnalysisResult | null => {
  const db = getDatabase()
  const row = db
    .prepare(`
      SELECT analyses.*, analysis_payloads.variants_json, analysis_payloads.workbench_json
      FROM analyses
      LEFT JOIN analysis_payloads ON analysis_payloads.analysis_id = analyses.id
      WHERE analyses.id = ?
    `)
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
  const db = getDatabase()
  const rows = db
    .prepare('SELECT variants_json FROM analysis_payloads')
    .all() as Array<{ variants_json: string }>

  return rows.flatMap((row) => parseJson<VariantAnnotation[]>(row.variants_json, []))
}

export const getSourceCache = (cacheKey: string) => {
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
  const db = getDatabase()
  db.prepare(`
    INSERT INTO source_cache (cache_key, source, request_url, payload_json, fetched_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET
      source = excluded.source,
      request_url = excluded.request_url,
      payload_json = excluded.payload_json,
      fetched_at = excluded.fetched_at,
      expires_at = excluded.expires_at
  `).run(
    input.cacheKey,
    input.source,
    input.requestUrl,
    input.payloadJson,
    input.fetchedAt,
    input.expiresAt,
  )
}

export const readSourceCachePayload = <T,>(cacheKey: string) => {
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
