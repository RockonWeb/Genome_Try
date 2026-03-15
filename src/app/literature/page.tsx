import { LiteratureSearchForm } from '@/components/research/LiteratureSearchForm'
import { Badge } from '@/components/ui/Badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { DEFAULT_SPECIES_ID, getSpeciesDefinition } from '@/lib/constants'
import {
  getDefaultLiteratureFilters,
  normalizeLiteratureSort,
  searchLiterature,
} from '@/lib/literature'
import { getTranslationProviderLabel } from '@/lib/server/translation'
import type { LiteratureSource, SpeciesId } from '@/types/genome'

export default async function LiteraturePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    species?: string
    yearFrom?: string
    sort?: string
    source?: string
    translate?: string
  }>
}) {
  const params = await searchParams
  const defaults = getDefaultLiteratureFilters()
  const query = params.q?.trim() ?? ''
  const speciesId =
    (params.species as SpeciesId | undefined) ?? DEFAULT_SPECIES_ID
  const yearFrom = Number(params.yearFrom)
  const sort = normalizeLiteratureSort(params.sort)
  const translate = params.translate === '0' ? false : defaults.translate
  const source = (
    params.source === 'Europe PMC' ? 'Europe PMC' : defaults.source
  ) as LiteratureSource
  const translationProvider = getTranslationProviderLabel()
  const sortLabel =
    sort === 'citations'
      ? 'по числу цитирований'
      : sort === 'newest'
        ? 'сначала новые'
        : 'по релевантности'
  const result = query
    ? await searchLiterature({
        query,
        speciesId,
        filters: {
          yearFrom: Number.isFinite(yearFrom) ? yearFrom : defaults.yearFrom,
          sort,
          source,
          translate,
        },
      })
    : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Поиск литературы
          </Badge>
          <CardTitle className="text-3xl">
            Поиск и ранжирование научных статей
          </CardTitle>
          <CardDescription>
            Статьи из Europe PMC с серверной фильтрацией по году, сортировкой по
            релевантности, цитируемости или новизне и быстрым переходом из
            рабочей области поиска. Аннотации можно автоматически переводить на
            русский через{' '}
            {translationProvider ?? 'настроенный серверный сервис'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LiteratureSearchForm
            initialQuery={query}
            initialSpeciesId={speciesId}
            initialYearFrom={result?.filters.yearFrom ?? defaults.yearFrom}
            initialSort={result?.filters.sort ?? defaults.sort}
            initialTranslate={result?.filters.translate ?? translate}
          />
          {!translationProvider ? (
            <p className="mt-4 text-xs leading-6 text-slate-500">
              Автоперевод включится после настройки `DEEPL_API_KEY` или
              `LIBRETRANSLATE_URL` на сервере.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {result ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-slate-400">Запрос</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {result.query}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-slate-400">Вид</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {getSpeciesDefinition(result.speciesId).label}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-slate-400">Статей</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {result.items.length}
                </p>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Результаты</CardTitle>
              <CardDescription>
                {result.filters.source} · начиная с {result.filters.yearFrom} ·{' '}
                {sortLabel}
                {result.filters.translate
                  ? translationProvider
                    ? ` · перевод аннотаций через ${translationProvider}`
                    : ' · перевод аннотаций ждёт настройки сервиса'
                  : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-2">
              {result.items.length ? (
                result.items.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="border-genome-border bg-muted/40 hover:border-primary/40 rounded-2xl border p-5 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{item.year}</Badge>
                      <Badge variant="outline">{item.journal}</Badge>
                      {item.snippetTranslated ? (
                        <Badge variant="outline">
                          Перевод {item.translationProvider ?? 'включён'}
                        </Badge>
                      ) : null}
                      {item.citedByCount ? (
                        <Badge variant="outline">
                          {item.citedByCount} цитирований
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-base font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      {item.snippet}
                    </p>
                    {item.snippetTranslated && item.originalSnippet ? (
                      <p className="mt-2 text-xs leading-6 text-slate-500">
                        Оригинал: {item.originalSnippet}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs tracking-[0.18em] text-slate-500 uppercase">
                      {item.authors.join(', ') || 'Авторы не указаны'}
                    </p>
                  </a>
                ))
              ) : (
                <div className="border-genome-border bg-muted/30 col-span-full rounded-3xl border border-dashed px-4 py-12 text-center text-sm text-slate-500">
                  По этому запросу статьи не найдены в выбранном временном окне.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Введите идентификатор гена, символ или исследовательский запрос,
            чтобы получить подборку научных статей.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
