'use client'

import dynamic from 'next/dynamic'

const DNABackground = dynamic(
  () => import('@/components/ui/DNABackground').then((module) => module.DNABackground),
  { ssr: false }
)

export function DNABackgroundClient() {
  return <DNABackground />
}
