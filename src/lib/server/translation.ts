import { createHash } from 'node:crypto'
import {
  readSourceCachePayload,
  saveSourceCache,
} from '@/lib/server/analysisRepository'
import type { LiteratureCard } from '@/types/genome'

type TranslationTargetLanguage = 'ru'

type CachedTranslationPayload = {
  translatedText: string
  provider: string
  targetLanguage: TranslationTargetLanguage
}

type TranslationProvider =
  | {
      kind: 'deepl'
      label: 'DeepL'
      authKey: string
      endpoint: string
    }
  | {
      kind: 'libretranslate'
      label: 'LibreTranslate'
      apiKey?: string
      endpoint: string
    }

const TRANSLATION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const NON_TRANSLATABLE_SNIPPETS = new Set(['Аннотация недоступна.'])

const normalizeEndpoint = (value: string) => value.replace(/\/+$/, '')

const getTranslationProvider = (): TranslationProvider | null => {
  const deeplAuthKey = process.env.DEEPL_API_KEY?.trim()
  if (deeplAuthKey) {
    return {
      kind: 'deepl',
      label: 'DeepL',
      authKey: deeplAuthKey,
      endpoint: normalizeEndpoint(
        process.env.DEEPL_API_URL?.trim() || 'https://api-free.deepl.com',
      ),
    }
  }

  const libreTranslateUrl = process.env.LIBRETRANSLATE_URL?.trim()
  if (libreTranslateUrl) {
    return {
      kind: 'libretranslate',
      label: 'LibreTranslate',
      apiKey: process.env.LIBRETRANSLATE_API_KEY?.trim() || undefined,
      endpoint: normalizeEndpoint(libreTranslateUrl),
    }
  }

  return null
}

const getTargetLanguageCode = (
  provider: TranslationProvider,
  targetLanguage: TranslationTargetLanguage,
) =>
  provider.kind === 'deepl'
    ? targetLanguage.toUpperCase()
    : targetLanguage.toLowerCase()

const buildCacheKey = (
  provider: TranslationProvider,
  targetLanguage: TranslationTargetLanguage,
  text: string,
) => {
  const hash = createHash('sha1').update(text).digest('hex')
  return `translation:${provider.kind}:${targetLanguage}:${hash}`
}

const readCachedTranslation = (
  provider: TranslationProvider,
  targetLanguage: TranslationTargetLanguage,
  text: string,
) => {
  const cacheKey = buildCacheKey(provider, targetLanguage, text)
  const cached = readSourceCachePayload<CachedTranslationPayload>(cacheKey)
  const now = Date.now()

  if (!cached || new Date(cached.expiresAt).getTime() <= now) {
    return null
  }

  return cached.payload.translatedText
}

const writeCachedTranslation = (
  provider: TranslationProvider,
  targetLanguage: TranslationTargetLanguage,
  text: string,
  translatedText: string,
) => {
  const cacheKey = buildCacheKey(provider, targetLanguage, text)
  const fetchedAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + TRANSLATION_TTL_MS).toISOString()

  saveSourceCache({
    cacheKey,
    source: `translation:${provider.kind}`,
    requestUrl: `translate://${provider.kind}/${targetLanguage}/${cacheKey.split(':').at(-1)}`,
    payloadJson: JSON.stringify({
      translatedText,
      provider: provider.label,
      targetLanguage,
    } satisfies CachedTranslationPayload),
    fetchedAt,
    expiresAt,
  })
}

const shouldTranslateSnippet = (text: string) => {
  const normalized = text.trim()
  if (!normalized || NON_TRANSLATABLE_SNIPPETS.has(normalized)) {
    return false
  }

  return !/^[^A-Za-z]*[А-Яа-яЁё][^A-Za-z]*$/.test(normalized)
}

const translateWithDeepL = async (
  provider: Extract<TranslationProvider, { kind: 'deepl' }>,
  texts: string[],
  targetLanguage: TranslationTargetLanguage,
) => {
  const response = await fetch(`${provider.endpoint}/v2/translate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `DeepL-Auth-Key ${provider.authKey}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      text: texts,
      target_lang: getTargetLanguageCode(provider, targetLanguage),
      preserve_formatting: true,
    }),
  })

  if (!response.ok) {
    throw new Error(`DeepL request failed: ${response.status}`)
  }

  const payload = (await response.json()) as {
    translations?: Array<{ text?: string }>
  }

  return texts.map(
    (text, index) => payload.translations?.[index]?.text?.trim() || text,
  )
}

const translateWithLibreTranslate = async (
  provider: Extract<TranslationProvider, { kind: 'libretranslate' }>,
  texts: string[],
  targetLanguage: TranslationTargetLanguage,
) =>
  Promise.all(
    texts.map(async (text) => {
      const response = await fetch(`${provider.endpoint}/translate`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          q: text,
          source: 'auto',
          target: getTargetLanguageCode(provider, targetLanguage),
          format: 'text',
          ...(provider.apiKey ? { api_key: provider.apiKey } : {}),
        }),
      })

      if (!response.ok) {
        throw new Error(`LibreTranslate request failed: ${response.status}`)
      }

      const payload = (await response.json()) as {
        translatedText?: string
      }

      return payload.translatedText?.trim() || text
    }),
  )

const translateTexts = async (
  provider: TranslationProvider,
  texts: string[],
  targetLanguage: TranslationTargetLanguage,
) => {
  if (!texts.length) {
    return []
  }

  if (provider.kind === 'deepl') {
    return translateWithDeepL(provider, texts, targetLanguage)
  }

  return translateWithLibreTranslate(provider, texts, targetLanguage)
}

export const translateLiteratureCards = async (
  items: LiteratureCard[],
  targetLanguage: TranslationTargetLanguage = 'ru',
) => {
  const provider = getTranslationProvider()
  if (!provider || !items.length) {
    return items
  }

  const textsToTranslate = Array.from(
    new Set(
      items
        .map((item) => item.snippet.trim())
        .filter((snippet) => shouldTranslateSnippet(snippet)),
    ),
  )

  if (!textsToTranslate.length) {
    return items
  }

  const translatedBySource = new Map<string, string>()
  const pendingTexts: string[] = []

  for (const snippet of textsToTranslate) {
    const cachedTranslation = readCachedTranslation(
      provider,
      targetLanguage,
      snippet,
    )

    if (cachedTranslation) {
      translatedBySource.set(snippet, cachedTranslation)
      continue
    }

    pendingTexts.push(snippet)
  }

  if (pendingTexts.length) {
    const translatedTexts = await translateTexts(
      provider,
      pendingTexts,
      targetLanguage,
    )

    pendingTexts.forEach((text, index) => {
      const translatedText = translatedTexts[index]?.trim() || text
      translatedBySource.set(text, translatedText)
      writeCachedTranslation(provider, targetLanguage, text, translatedText)
    })
  }

  return items.map((item) => {
    const originalSnippet = item.snippet.trim()
    const translatedSnippet = translatedBySource.get(originalSnippet)

    if (!translatedSnippet || translatedSnippet === originalSnippet) {
      return item
    }

    return {
      ...item,
      snippet: translatedSnippet,
      originalSnippet,
      snippetTranslated: true,
      translationProvider: provider.label,
    }
  })
}

export const getTranslationProviderLabel = () => getTranslationProvider()?.label
