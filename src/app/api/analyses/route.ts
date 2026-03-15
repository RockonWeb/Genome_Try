import { NextResponse } from 'next/server'
import { listAnalyses } from '@/lib/server/analysisRepository'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(listAnalyses())
}
