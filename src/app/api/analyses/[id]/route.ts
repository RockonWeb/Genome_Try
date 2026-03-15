import { NextResponse } from 'next/server'
import { getAnalysisById } from '@/lib/server/analysisRepository'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params
  const result = getAnalysisById(resolvedParams.id)

  if (!result) {
    return NextResponse.json({ message: 'Analysis not found.' }, { status: 404 })
  }

  return NextResponse.json(result)
}
