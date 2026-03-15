'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  DEFAULT_SPECIES_ID,
  SAMPLE_QUERIES,
  SPECIES_OPTIONS,
} from '@/lib/constants'
import type { SpeciesId } from '@/types/genome'

export function WorkbenchSearchForm({
  initialQuery,
  initialSpeciesId = DEFAULT_SPECIES_ID,
}: {
  initialQuery: string
  initialSpeciesId?: SpeciesId
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [speciesId, setSpeciesId] = useState<SpeciesId>(initialSpeciesId)

  const runSearch = (nextQuery = query, nextSpeciesId = speciesId) => {
    if (!nextQuery.trim()) {
      return
    }

    router.push(
      `/workbench?q=${encodeURIComponent(nextQuery.trim())}&species=${nextSpeciesId}`,
    )
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        runSearch()
      }}
    >
      <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1fr)_220px_200px]">
        <div className="space-y-2">
          <label
            htmlFor="workbench-query"
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
              id="workbench-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="AT1G01010, NAC001, 1:3631-5899, 1:3631 G>A"
              className="border-genome-border bg-muted/40 focus:border-primary h-11 w-full rounded-2xl border pr-4 pl-11 text-sm text-white transition-colors outline-none"
              aria-describedby="workbench-query-help"
            />
          </div>
          <p id="workbench-query-help" className="text-xs text-slate-500">
            Можно вводить AGI ID, символ гена, локус или простую запись
            варианта.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="workbench-species"
            className="text-sm font-medium text-slate-300"
          >
            Вид
          </label>
          <select
            id="workbench-species"
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

        <div className="flex items-end">
          <Button type="submit" className="h-11 w-full rounded-2xl">
            Открыть рабочую область
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-300">Примеры запросов</p>
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
          role="group"
          aria-label="Примеры запросов"
        >
          {SAMPLE_QUERIES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setQuery(sample)
                runSearch(sample)
              }}
              className="border-genome-border hover:border-primary/40 shrink-0 rounded-full border px-4 py-2 text-sm whitespace-nowrap text-slate-300 transition-colors hover:text-white"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}
