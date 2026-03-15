import type { Metadata } from 'next'
import { IBM_Plex_Sans } from 'next/font/google'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { APP_CONFIG } from '@/lib/constants'
import './globals.css'

const plex = IBM_Plex_Sans({
  variable: '--font-plex',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} — Платформа для геномики растений`,
  description: APP_CONFIG.description,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="dark">
      <body
        className={`${plex.variable} bg-genome-bg text-foreground selection:bg-primary/20 min-h-dvh font-sans antialiased`}
      >
        <a
          href="#main-content"
          className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-xl focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
        >
          Перейти к основному содержимому
        </a>
        <div className="noise-bg fixed inset-0" />
        <div className="relative flex min-h-dvh">
          <Sidebar />

          <div className="flex min-h-dvh flex-1 flex-col lg:pl-64">
            <Header />
            <main
              id="main-content"
              className="flex-1 px-4 pt-6 pb-24 md:px-6 md:pt-8 lg:px-8 lg:pb-8"
            >
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  )
}
