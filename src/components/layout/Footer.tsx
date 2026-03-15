import { APP_CONFIG } from '@/lib/constants'

export function Footer() {
  return (
    <footer className="border-t border-genome-border bg-genome-bg/70 py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-center text-sm text-slate-500 md:flex-row md:px-6 md:text-left lg:px-8">
        <p>
          {APP_CONFIG.name} {APP_CONFIG.version}. Ensembl VEP подключён для VCF,
          а fallback-данные закрывают сценарии без полноценного лабораторного backend.
        </p>
        <a href={`mailto:${APP_CONFIG.supportEmail}`} className="transition-colors hover:text-white">
          {APP_CONFIG.supportEmail}
        </a>
      </div>
    </footer>
  )
}
