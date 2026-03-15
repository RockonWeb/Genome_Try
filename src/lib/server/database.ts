import { mkdirSync, rmSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { getPhytoStoragePaths } from '@/lib/server/storagePaths'

type DatabaseState = {
  dataDir: string
  db: DatabaseSync
}

declare global {
  var __phytoscopeDatabaseState: DatabaseState | undefined
}

const ensureDirectories = () => {
  const paths = getPhytoStoragePaths()
  for (const directory of [paths.dataDir, paths.uploadsDir, paths.artifactsDir]) {
    mkdirSync(directory, { recursive: true })
  }
}

const initializeSchema = (db: DatabaseSync) => {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      sample_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      format TEXT NOT NULL,
      species_id TEXT NOT NULL,
      assembly_id TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      variant_count INTEGER NOT NULL,
      high_impact_variants INTEGER NOT NULL,
      mean_depth REAL NOT NULL,
      mean_quality REAL NOT NULL,
      file_size_mb REAL NOT NULL,
      focus_gene TEXT NOT NULL,
      insight_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      status_detail TEXT,
      pipeline_mode TEXT NOT NULL,
      stored_file_path TEXT
    );

    CREATE TABLE IF NOT EXISTS analysis_payloads (
      analysis_id TEXT PRIMARY KEY REFERENCES analyses(id) ON DELETE CASCADE,
      variants_json TEXT NOT NULL,
      workbench_json TEXT
    );

    CREATE TABLE IF NOT EXISTS source_cache (
      cache_key TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      request_url TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS source_health_checks (
      source TEXT NOT NULL,
      species_id TEXT NOT NULL,
      status_json TEXT NOT NULL,
      checked_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      PRIMARY KEY (source, species_id)
    );
  `)
}

export const getDatabase = () => {
  const paths = getPhytoStoragePaths()

  if (globalThis.__phytoscopeDatabaseState?.dataDir === paths.dataDir) {
    return globalThis.__phytoscopeDatabaseState.db
  }

  globalThis.__phytoscopeDatabaseState?.db.close()
  ensureDirectories()

  const db = new DatabaseSync(paths.dbPath)
  initializeSchema(db)
  globalThis.__phytoscopeDatabaseState = {
    dataDir: paths.dataDir,
    db,
  }

  return db
}

export const resetDatabaseForTests = () => {
  globalThis.__phytoscopeDatabaseState?.db.close()
  globalThis.__phytoscopeDatabaseState = undefined

  const paths = getPhytoStoragePaths()
  rmSync(paths.dataDir, { recursive: true, force: true })
}
