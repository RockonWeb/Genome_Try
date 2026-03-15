'use client'

import Link from 'next/link'
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, LibraryBig, Microscope } from 'lucide-react'
import { WorkbenchResults } from '@/components/research/WorkbenchResults'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useAnalysisStore } from '@/hooks/useAnalysisStore'
import { downloadVariantsCsv, printAnalysisReport } from '@/lib/exporters'
import { getSpeciesDefinition, STATUS_LABELS } from '@/lib/constants'

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingState />}>
      <DashboardPageContent />
    </Suspense>
  )
}

function DashboardPageContent() {
  const searchParams = useSearchParams()
  const {
    currentAnalysis,
    variants,
    currentWorkbench,
    reports,
    isLoading,
    error,
    fetchReports,
    fetchAnalysisResults,
  } = useAnalysisStore()

  const analysisId =
    searchParams.get('id') ?? currentAnalysis?.id ?? reports[0]?.id ?? null

  useEffect(() => {
    if (!reports.length) {
      void fetchReports()
    }
  }, [fetchReports, reports.length])

  useEffect(() => {
    if (analysisId && analysisId !== currentAnalysis?.id) {
      void fetchAnalysisResults(analysisId)
    }
  }, [analysisId, currentAnalysis?.id, fetchAnalysisResults])

  if (isLoading && !currentAnalysis) {
    return <DashboardLoadingState />
  }

  if (!currentAnalysis) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="flex flex-col items-center gap-5 py-14 text-center">
          <Microscope className="text-primary h-10 w-10" />
          <div>
            <p className="text-xl font-semibold text-white">
              Нет доступного анализа
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Запустите загрузку файла или откройте один из готовых
              исследовательских запусков.
            </p>
          </div>
          <Button asChild>
            <Link href="/upload">Перейти к загрузке</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (currentAnalysis.status !== 'completed') {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Статус анализа
          </Badge>
          <CardTitle className="text-3xl">
            {currentAnalysis.status === 'failed'
              ? 'Этот запуск завершился с ошибкой'
              : 'Этот запуск ещё не готов к полному исследовательскому обзору'}
          </CardTitle>
          <CardDescription>
            {currentAnalysis.status === 'failed'
              ? 'Локальный запуск сохранён, но онлайн-аннотация не смогла завершиться.'
              : 'После подключения полной backend-обработки этот запуск сможет перейти к полному исследовательскому обзору.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="border-genome-border bg-muted/40 rounded-2xl border p-4 text-sm text-slate-300">
            Текущий статус:{' '}
            <span className="font-semibold text-white">
              {STATUS_LABELS[currentAnalysis.status]}
            </span>
            {currentAnalysis.statusDetail ? (
              <p className="mt-2 text-slate-400">
                {currentAnalysis.statusDetail}
              </p>
            ) : null}
          </div>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/reports">Открыть архив запусков</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/upload">Новый запуск</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Badge variant="success">Образец {currentAnalysis.sampleId}</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Исследовательская панель анализа
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {currentAnalysis.fileName} ·{' '}
            {getSpeciesDefinition(currentAnalysis.speciesId).label} ·{' '}
            {currentAnalysis.assemblyId}
          </p>
          {currentAnalysis.statusDetail ? (
            <p className="mt-2 text-sm text-slate-500">
              {currentAnalysis.statusDetail}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => downloadVariantsCsv(currentAnalysis, variants)}
          >
            CSV
          </Button>
          <Button
            onClick={() => printAnalysisReport(currentAnalysis, variants)}
          >
            PDF
          </Button>
          <Button asChild variant="outline">
            <Link
              href={`/literature?q=${encodeURIComponent(
                currentWorkbench?.gene?.id ??
                  currentWorkbench?.query.geneSymbol ??
                  currentWorkbench?.query.normalized ??
                  currentAnalysis.focusGene,
              )}&species=${currentAnalysis.speciesId}`}
            >
              <LibraryBig className="mr-2 h-4 w-4" />
              Литература
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/reports">
              <ArrowLeft className="mr-2 h-4 w-4" />К архиву
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <div
          className="border-destructive/20 bg-destructive/5 text-destructive rounded-2xl border px-4 py-3 text-sm"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {currentWorkbench ? (
        <WorkbenchResults
          workbench={{
            ...currentWorkbench,
            variants: variants.length ? variants : currentWorkbench.variants,
          }}
          summary={currentAnalysis}
          title="Исследовательский обзор по загрузке"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Рабочая область недоступна</CardTitle>
            <CardDescription>
              Для этого запуска не удалось собрать полный исследовательский
              обзор. Экспорт вариантов остаётся доступным.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}

function DashboardLoadingState() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
        <Spinner className="h-8 w-8" />
        <div>
          <p className="text-lg font-semibold text-white">Загружаю анализ</p>
          <p className="mt-2 text-sm text-slate-400">
            Подготавливаю запись анализа и связанную исследовательскую рабочую
            область.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
