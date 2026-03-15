'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DEFAULT_SPECIES_ID, SPECIES_OPTIONS } from '@/lib/constants'
import type { LiteratureSort, SpeciesId } from '@/types/genome'

export function LiteratureSearchForm({
  initialQuery,
  initialSpeciesId = DEFAULT_SPECIES_ID,
  initialYearFrom,
  initialSort,
  initialTranslate,
}: {
  initialQuery: string
  initialSpeciesId?: SpeciesId
  initialYearFrom: number
  initialSort: LiteratureSort
  initialTranslate: boolean
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [speciesId, setSpeciesId] = useState<SpeciesId>(initialSpeciesId)
  const [yearFrom, setYearFrom] = useState(String(initialYearFrom))
  const [sort, setSort] = useState<LiteratureSort>(initialSort)
  const [translate, setTranslate] = useState(initialTranslate)

  const runSearch = () => {
    const params = new URLSearchParams()

    if (query.trim()) {
      params.set('q', query.trim())
    }

    params.set('species', speciesId)
    params.set('yearFrom', yearFrom)
    params.set('sort', sort)
    params.set('source', 'Europe PMC')
    params.set('translate', translate ? '1' : '0')
    router.push(`/literature?${params.toString()}`)
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        runSearch()
      }}
    >
      <div className="grid items-end gap-3 xl:grid-cols-[minmax(0,1fr)_220px_160px_200px_200px_180px]">
        <div className="space-y-2">
          <label
            htmlFor="literature-query"
            className="text-sm font-medium text-slate-300"
          >
            Запрос
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              id="literature-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="AT1G01010, PIF4, seed dormancy"
              className="border-genome-border bg-muted/40 focus:border-primary h-11 w-full rounded-2xl border pr-4 pl-11 text-sm text-white transition-colors outline-none"
              aria-describedby="literature-query-help"
            />
          </div>
          <p id="literature-query-help" className="text-xs text-slate-500">
            Используйте идентификатор гена, символ гена или тематический
            исследовательский запрос.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="literature-species"
            className="text-sm font-medium text-slate-300"
          >
            Вид
          </label>
          <select
            id="literature-species"
            value={speciesId}
            onChange={(event) => setSpeciesId(event.target.value as SpeciesId)}
            className="border-genome-border bg-muted/40 focus:border-primary h-11 w-full rounded-2xl border px-4 text-sm text-white transition-colors outline-none"
          >
            {SPECIES_OPTIONS.map((species) => (
              <option key={species.id} value={species.id}>
                {species.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="literature-year-from"
            className="text-sm font-medium text-slate-300"
          >
            С какого года
          </label>
          <input
            id="literature-year-from"
            value={yearFrom}
            onChange={(event) => setYearFrom(event.target.value)}
            inputMode="numeric"
            className="border-genome-border bg-muted/40 focus:border-primary h-11 w-full rounded-2xl border px-4 text-sm text-white transition-colors outline-none"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="literature-sort"
            className="text-sm font-medium text-slate-300"
          >
            Сортировка
          </label>
          <select
            id="literature-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as LiteratureSort)}
            className="border-genome-border bg-muted/40 focus:border-primary h-11 w-full rounded-2xl border px-4 text-sm text-white transition-colors outline-none"
          >
            <option value="relevance">По релевантности</option>
            <option value="citations">По цитируемости</option>
            <option value="newest">Сначала новые</option>
          </select>
        </div>

        <label
          htmlFor="literature-translate"
          className="border-genome-border bg-muted/30 flex h-11 items-center gap-3 rounded-2xl border px-4 text-sm text-slate-300"
        >
          <input
            id="literature-translate"
            type="checkbox"
            checked={translate}
            onChange={(event) => setTranslate(event.target.checked)}
            className="accent-primary h-4 w-4 rounded border-slate-600 bg-slate-950"
          />
          Переводить аннотации
        </label>

        <div className="flex items-end">
          <Button type="submit" className="h-11 w-full rounded-2xl">
            Искать статьи
          </Button>
        </div>
      </div>
    </form>
  )
}
