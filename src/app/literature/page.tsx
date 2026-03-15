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
  }>
}) {
  const params = await searchParams
  const defaults = getDefaultLiteratureFilters()
  const query = params.q?.trim() ?? ''
  const speciesId = (params.species as SpeciesId | undefined) ?? DEFAULT_SPECIES_ID
  const yearFrom = Number(params.yearFrom)
  const sort = normalizeLiteratureSort(params.sort)
  const source = (params.source === 'Europe PMC'
    ? 'Europe PMC'
    : defaults.source) as LiteratureSource
  const result = query
    ? await searchLiterature({
        query,
        speciesId,
        filters: {
          yearFrom: Number.isFinite(yearFrom) ? yearFrom : defaults.yearFrom,
          sort,
          source,
        },
      })
    : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Literature workspace
          </Badge>
          <CardTitle className="text-3xl">Поиск и ранжирование научных статей</CardTitle>
          <CardDescription>
            Europe PMC results с серверной фильтрацией по году, сортировкой по relevance,
            citations или newest и быстрым переходом из gene-centric workbench.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LiteratureSearchForm
            initialQuery={query}
            initialSpeciesId={speciesId}
            initialYearFrom={result?.filters.yearFrom ?? defaults.yearFrom}
            initialSort={result?.filters.sort ?? defaults.sort}
          />
        </CardContent>
      </Card>

      {result ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-slate-400">Query</p>
                <p className="mt-2 text-2xl font-bold text-white">{result.query}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-slate-400">Species</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {getSpeciesDefinition(result.speciesId).label}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-slate-400">Articles</p>
                <p className="mt-2 text-2xl font-bold text-white">{result.items.length}</p>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                {result.filters.source} · from {result.filters.yearFrom} · sorted by{' '}
                {result.filters.sort}
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
                    className="rounded-2xl border border-genome-border bg-muted/40 p-5 transition-colors hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{item.year}</Badge>
                      <Badge variant="outline">{item.journal}</Badge>
                      {item.citedByCount ? (
                        <Badge variant="outline">cited {item.citedByCount}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-3 text-base font-semibold text-white">{item.title}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{item.snippet}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {item.authors.join(', ') || 'Authors unavailable'}
                    </p>
                  </a>
                ))
              ) : (
                <div className="col-span-full rounded-3xl border border-dashed border-genome-border bg-muted/30 px-4 py-12 text-center text-sm text-slate-500">
                  По этому запросу статьи не найдены в выбранном временном окне.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Введите gene ID, символ или исследовательский запрос, чтобы собрать literature
            workspace.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
