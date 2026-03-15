'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Search } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Исследовательская панель',
    subtitle: 'Mock-платформа для визуализации и приоритизации геномных находок.',
  },
  '/upload': {
    title: 'Загрузка данных',
    subtitle: 'Подготовка исходных файлов и запуск нового анализа.',
  },
  '/dashboard': {
    title: 'Аналитический дашборд',
    subtitle: 'Ключевые метрики, Manhattan plot и таблица приоритетных вариантов.',
  },
  '/reports': {
    title: 'История отчётов',
    subtitle: 'Архив завершённых, текущих и проблемных запусков.',
  },
}

export const Header = () => {
  const pathname = usePathname()
  const meta = pageMeta[pathname] ?? pageMeta['/']

  return (
    <header className="sticky top-0 z-40 border-b border-genome-border bg-genome-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl genome-gradient shadow-lg shadow-primary/20 lg:hidden">
            <div className="h-4 w-4 rounded-sm border-2 border-white/90 rotate-45" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              GenomeScope workspace
            </p>
            <h1 className="truncate text-sm font-semibold text-white md:text-base">
              {meta.title}
            </h1>
          </div>
        </div>

        <label className="hidden min-w-0 flex-1 items-center gap-3 rounded-2xl border border-genome-border bg-genome-card/70 px-4 py-2 text-sm text-slate-400 xl:flex xl:max-w-xl">
          <Search size={18} className="shrink-0" />
          <input
            type="text"
            placeholder={meta.subtitle}
            className="w-full bg-transparent text-slate-200 outline-none placeholder:text-slate-500"
            aria-label="Поиск"
          />
        </label>

        <div className="flex items-center gap-2 md:gap-3">
          <Badge variant="success" className="hidden md:inline-flex">
            Mock API ready
          </Badge>
          <Tooltip content="Новых лабораторных оповещений нет">
            <button
              type="button"
              className="rounded-full border border-genome-border bg-genome-card/70 p-2 text-slate-400 transition-colors hover:text-white"
              aria-label="Уведомления"
            >
              <Bell size={18} />
            </button>
          </Tooltip>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/upload">Новый анализ</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
