import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { LiteratureCard } from '@/types/genome'

export function LiteratureResultCard({ item }: { item: LiteratureCard }) {
  return (
    <article className="border-genome-border bg-muted/40 hover:border-primary/40 rounded-2xl border p-5 transition-colors">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{item.year}</Badge>
        <Badge variant="outline">{item.journal}</Badge>
        {item.snippetTranslated ? (
          <Badge variant="outline">
            Перевод {item.translationProvider ?? 'включён'}
          </Badge>
        ) : null}
        {item.citedByCount ? (
          <Badge variant="outline">{item.citedByCount} цитирований</Badge>
        ) : null}
      </div>

      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block text-base font-semibold text-white transition-colors hover:text-sky-300"
      >
        {item.title}
      </a>

      <details className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/20 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-300">
          Аннотация
        </summary>
        <div className="mt-3 space-y-2">
          <p className="text-sm leading-7 text-slate-300">{item.snippet}</p>
          {item.snippetTranslated && item.originalSnippet ? (
            <p className="text-xs leading-6 text-slate-500">
              Оригинал: {item.originalSnippet}
            </p>
          ) : null}
        </div>
      </details>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-xs tracking-[0.18em] text-slate-500 uppercase">
          {item.authors.join(', ') || 'Авторы не указаны'}
        </p>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-sky-300 transition-colors hover:text-sky-200"
        >
          Открыть статью
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </article>
  )
}
