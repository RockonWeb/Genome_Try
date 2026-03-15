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
  title: `${APP_CONFIG.name} — Plant Genomics Research Assistant`,
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
        className={`${plex.variable} min-h-dvh bg-genome-bg font-sans text-foreground antialiased selection:bg-primary/20`}
      >
        <div className="noise-bg fixed inset-0" />
        <div className="relative flex min-h-dvh">
          <Sidebar />

          <div className="flex min-h-dvh flex-1 flex-col lg:pl-64">
            <Header />
            <main className="flex-1 px-4 pb-24 pt-6 md:px-6 md:pt-8 lg:px-8 lg:pb-8">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  )
}
