import type { SourceObservation } from '@/types/genome'
import {
  readSourceCachePayload,
  saveSourceCache,
} from '@/lib/server/analysisRepository'

type CachedPayload<T> = {
  payload: T
  observedVia: SourceObservation
  fetchedAt: string
}

type SourceCacheInput = {
  source: string
  url: string
  ttlMs: number
  refresh?: boolean
}

const nowIso = () => new Date().toISOString()

const buildCacheKey = (source: string, url: string) => `${source}:${url}`

export const fetchCachedJson = async <T>({
  source,
  url,
  ttlMs,
  refresh = false,
}: SourceCacheInput): Promise<CachedPayload<T>> => {
  const cacheKey = buildCacheKey(source, url)
  const cached = readSourceCachePayload<T>(cacheKey)
  const now = Date.now()

  if (!refresh && cached && new Date(cached.expiresAt).getTime() > now) {
    return {
      payload: cached.payload,
      observedVia: 'cache',
      fetchedAt: cached.fetchedAt,
    }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }

      const payload = (await response.json()) as T
      const fetchedAt = nowIso()
      const expiresAt = new Date(Date.now() + ttlMs).toISOString()

      saveSourceCache({
        cacheKey,
        source,
        requestUrl: url,
        payloadJson: JSON.stringify(payload),
        fetchedAt,
        expiresAt,
      })

      return {
        payload,
        observedVia: 'live',
        fetchedAt,
      }
    } finally {
      clearTimeout(timeout)
    }
  } catch {
    if (cached) {
      return {
        payload: cached.payload,
        observedVia: 'cache',
        fetchedAt: cached.fetchedAt,
      }
    }

    throw new Error(`Unable to fetch ${source} payload.`)
  }
}
