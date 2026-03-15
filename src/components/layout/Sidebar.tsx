'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText,
  Home,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  ScanSearch,
  Upload,
} from 'lucide-react'
import { APP_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: Home, label: 'Главная' },
  { href: '/workbench', icon: ScanSearch, label: 'Поиск' },
  { href: '/upload', icon: Upload, label: 'Загрузка' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Анализ' },
  { href: '/reports', icon: FileText, label: 'Запуски' },
  { href: '/literature', icon: LibraryBig, label: 'Статьи' },
]

const isActivePath = (pathname: string, href: string) =>
  href === '/' ? pathname === href : pathname.startsWith(href)

export const Sidebar = () => {
  const pathname = usePathname()

  return (
    <>
      <aside className="border-genome-border bg-genome-bg/85 fixed inset-y-0 left-0 hidden w-64 border-r p-6 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="mb-10 flex items-center gap-3">
          <div className="genome-gradient shadow-primary/20 flex h-11 w-11 items-center justify-center rounded-2xl shadow-xl">
            <div className="h-5 w-5 rotate-45 rounded-sm border-2 border-white/90" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-white">
              {APP_CONFIG.name}
            </p>
            <p className="text-xs text-slate-400">
              Исследовательская среда по геномике растений
            </p>
          </div>
        </div>

        <nav className="space-y-1.5" aria-label="Основная навигация">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all',
                  active
                    ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(45,212,191,0.2)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white',
                )}
              >
                <item.icon
                  size={18}
                  className={cn(
                    'transition-colors',
                    active
                      ? 'text-primary'
                      : 'text-slate-500 group-hover:text-white',
                  )}
                />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-genome-border bg-genome-card/70 mt-auto space-y-4 rounded-2xl border p-4">
          <div>
            <p className="text-sm font-semibold text-white">
              Стратегия источников
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              Основой служат открытые базы данных. Если отдельный источник
              временно недоступен, интерфейс переключается на резервный режим, а
              не ломает страницу целиком.
            </p>
          </div>
          <div className="border-genome-border bg-muted/40 rounded-xl border px-3 py-2.5">
            <p className="text-xs tracking-[0.18em] text-slate-400 uppercase">
              Локальная сессия
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Авторизация не используется, поэтому завершать сессию здесь не
              требуется.
            </p>
          </div>
          <div className="border-genome-border bg-muted/20 rounded-xl border px-3 py-2.5">
            <p className="text-xs tracking-[0.18em] text-slate-400 uppercase">
              Версия
            </p>
            <p className="mt-2 text-sm font-medium text-slate-200">
              {APP_CONFIG.version}
            </p>
          </div>
          <a
            href={`mailto:${APP_CONFIG.supportEmail}`}
            className="border-genome-border flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-sm text-slate-300 transition-colors hover:text-white"
          >
            <LogOut size={16} aria-hidden="true" />
            Связаться с поддержкой
          </a>
        </div>
      </aside>

      <nav
        className="border-genome-border bg-genome-card/90 fixed inset-x-4 bottom-4 z-50 flex items-center justify-between rounded-3xl border p-2 shadow-2xl shadow-black/40 backdrop-blur-xl lg:hidden"
        aria-label="Нижняя навигация"
      >
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs leading-tight font-medium transition-colors',
                active ? 'text-primary' : 'text-slate-400',
              )}
            >
              <item.icon size={18} />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
