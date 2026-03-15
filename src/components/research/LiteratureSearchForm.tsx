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
}: {
  initialQuery: string
  initialSpeciesId?: SpeciesId
  initialYearFrom: number
  initialSort: LiteratureSort
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [speciesId, setSpeciesId] = useState<SpeciesId>(initialSpeciesId)
  const [yearFrom, setYearFrom] = useState(String(initialYearFrom))
  const [sort, setSort] = useState<LiteratureSort>(initialSort)

  const runSearch = () => {
    const params = new URLSearchParams()

    if (query.trim()) {
      params.set('q', query.trim())
    }

    params.set('species', speciesId)
    params.set('yearFrom', yearFrom)
    params.set('sort', sort)
    params.set('source', 'Europe PMC')
    router.push(`/literature?${params.toString()}`)
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 xl:grid-cols-[1fr_220px_140px_180px_150px]">
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
            placeholder="AT1G01010, PIF4, seed dormancy"
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

        <input
          value={yearFrom}
          onChange={(event) => setYearFrom(event.target.value)}
          inputMode="numeric"
          className="rounded-2xl border border-genome-border bg-muted/40 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary"
          aria-label="Year from"
        />

        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as LiteratureSort)}
          className="rounded-2xl border border-genome-border bg-muted/40 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary"
        >
          <option value="relevance">relevance</option>
          <option value="citations">citations</option>
          <option value="newest">newest</option>
        </select>

        <Button className="rounded-2xl" onClick={runSearch}>
          Искать статьи
        </Button>
      </div>
    </div>
  )
}
