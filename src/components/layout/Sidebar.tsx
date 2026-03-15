'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  ScanSearch,
  Upload,
} from 'lucide-react'
import { APP_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: Home, label: 'Главная' },
  { href: '/workbench', icon: ScanSearch, label: 'Workbench' },
  { href: '/upload', icon: Upload, label: 'Upload' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/reports', icon: FileText, label: 'Reports' },
]

const isActivePath = (pathname: string, href: string) =>
  href === '/' ? pathname === href : pathname.startsWith(href)

export const Sidebar = () => {
  const pathname = usePathname()

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-genome-border bg-genome-bg/85 p-6 backdrop-blur-xl lg:flex lg:flex-col">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl genome-gradient shadow-xl shadow-primary/20">
            <div className="h-5 w-5 rounded-sm border-2 border-white/90 rotate-45" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-white">
              {APP_CONFIG.name}
            </p>
            <p className="text-xs text-slate-500">Plant genomics research cockpit</p>
          </div>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
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
                    active ? 'text-primary' : 'text-slate-500 group-hover:text-white',
                  )}
                />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto space-y-4 rounded-2xl border border-genome-border bg-genome-card/70 p-4">
          <div>
            <p className="text-sm font-semibold text-white">Source strategy</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Open sources are primary. TAIR remains optional, while partial source failure degrades to link cards instead of breaking the page.
            </p>
          </div>
          <p className="text-xs text-slate-500">{APP_CONFIG.supportEmail}</p>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-genome-border px-3 py-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <LogOut size={16} />
            Завершить сессию
          </button>
        </div>
      </aside>

      <nav className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between rounded-3xl border border-genome-border bg-genome-card/90 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl lg:hidden">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors',
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
