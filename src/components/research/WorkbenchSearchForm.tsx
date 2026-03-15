'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DEFAULT_SPECIES_ID, SAMPLE_QUERIES, SPECIES_OPTIONS } from '@/lib/constants'
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
    <div className="space-y-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px_160px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                runSearch()
              }
            }}
            placeholder="AT1G01010, NAC001, 1:3631-5899, 1:3631 G>A"
            className="w-full rounded-2xl border border-genome-border bg-muted/40 py-3 pl-11 pr-4 text-sm text-white outline-none transition-colors focus:border-primary"
          />
        </label>

        <select
          value={speciesId}
          onChange={(event) => setSpeciesId(event.target.value as SpeciesId)}
          className="rounded-2xl border border-genome-border bg-muted/40 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary"
        >
          {SPECIES_OPTIONS.map((species) => (
            <option key={species.id} value={species.id}>
              {species.label}
            </option>
          ))}
        </select>

        <Button className="h-full rounded-2xl" onClick={() => runSearch()}>
          Построить workbench
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SAMPLE_QUERIES.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => {
              setQuery(sample)
              runSearch(sample)
            }}
            className="rounded-full border border-genome-border px-4 py-2 text-sm text-slate-300 transition-colors hover:border-primary/40 hover:text-white"
          >
            {sample}
          </button>
        ))}
      </div>
    </div>
  )
}
