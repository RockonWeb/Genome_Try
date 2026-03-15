'use client'

import Link from 'next/link'
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  GitCompareArrows,
  HardDrive,
  Layers3,
  Search,
  Trees,
  X,
  XCircle,
} from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { useAnalysisStore } from '@/hooks/useAnalysisStore'
import {
  getSpeciesDefinition,
  STATUS_LABELS,
  SUPPORTED_FORMATS,
  SPECIES_OPTIONS,
} from '@/lib/constants'
import { downloadVariantsCsv, printAnalysisReport } from '@/lib/exporters'
import { analysisService } from '@/services/analysisService'
import { genomeApi } from '@/services/genomeApi'
import type {
  AnalysisSummary,
  ReportFilters,
  RunComparisonSummary,
  UploadAnalysisResult,
} from '@/types/genome'

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const initialFilters: ReportFilters = {
  search: '',
  speciesId: 'all',
  status: 'all',
  format: 'all',
}

export default function ReportsPage() {
  const { reports, analysesById, isLoading, error, fetchReports } =
    useAnalysisStore()
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [filters, setFilters] = useState<ReportFilters>(initialFilters)
  const deferredSearch = useDeferredValue(filters.search ?? '')
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [comparisonResults, setComparisonResults] = useState<
    UploadAnalysisResult[]
  >([])
  const [comparisonLoading, setComparisonLoading] = useState(false)
  const [comparisonError, setComparisonError] = useState<string | null>(null)

  useEffect(() => {
    if (!reports.length) {
      void fetchReports()
    }
  }, [fetchReports, reports.length])

  const getReportResult = useCallback(
    async (report: AnalysisSummary): Promise<UploadAnalysisResult | null> => {
      if (analysesById[report.id]) {
        return analysesById[report.id]
      }

      return genomeApi.getAnalysisResult(report.id)
    },
    [analysesById],
  )

  const filteredReports = useMemo(
    () =>
      analysisService.filterReports(reports, {
        ...filters,
        search: deferredSearch,
      }),
    [deferredSearch, filters, reports],
  )
  const completedReports = filteredReports.filter(
    (report) => report.status === 'completed',
  )
  const queuedReports = filteredReports.filter(
    (report) => report.status === 'queued' || report.status === 'processing',
  )
  const storageUsedGb = useMemo(
    () =>
      filteredReports.reduce((sum, report) => sum + report.fileSizeMb, 0) /
      1024,
    [filteredReports],
  )
  const averageDepth = useMemo(() => {
    if (!completedReports.length) {
      return 0
    }

    return (
      completedReports.reduce((sum, report) => sum + report.meanDepth, 0) /
      completedReports.length
    )
  }, [completedReports])

  const latestCompletedReport = completedReports[0] ?? null
  const selectedReports = useMemo(
    () =>
      compareIds
        .map((id) => reports.find((report) => report.id === id))
        .filter(Boolean) as AnalysisSummary[],
    [compareIds, reports],
  )

  useEffect(() => {
    setCompareIds((current) =>
      current.filter((id) =>
        reports.some(
          (report) => report.id === id && report.status === 'completed',
        ),
      ),
    )
  }, [reports])

  useEffect(() => {
    let cancelled = false

    if (compareIds.length !== 2) {
      setComparisonResults([])
      setComparisonLoading(false)
      setComparisonError(null)
      return
    }

    const runsToCompare = compareIds
      .map((id) => reports.find((report) => report.id === id))
      .filter(Boolean) as AnalysisSummary[]

    if (runsToCompare.length !== 2) {
      setComparisonResults([])
      setComparisonError(
        'Не удалось найти два выбранных запуска для сравнения.',
      )
      return
    }

    setComparisonLoading(true)
    setComparisonError(null)

    void Promise.all(runsToCompare.map((report) => getReportResult(report)))
      .then((results) => {
        if (cancelled) {
          return
        }

        if (results.some((result) => !result)) {
          setComparisonResults([])
          setComparisonError(
            'Не удалось загрузить оба результата для сравнения.',
          )
          return
        }

        setComparisonResults(results as UploadAnalysisResult[])
      })
      .catch(() => {
        if (!cancelled) {
          setComparisonResults([])
          setComparisonError('Сравнение не удалось загрузить.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setComparisonLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [compareIds, getReportResult, reports])

  const comparisonSummary = useMemo<RunComparisonSummary | null>(() => {
    if (comparisonResults.length !== 2) {
      return null
    }

    return analysisService.compareRuns(
      comparisonResults[0].summary,
      comparisonResults[1].summary,
      comparisonResults[0].variants,
      comparisonResults[1].variants,
    )
  }, [comparisonResults])

  const exportCsv = async (report: AnalysisSummary) => {
    setExportingId(report.id)

    try {
      const result = await getReportResult(report)
      if (result) {
        downloadVariantsCsv(report, result.variants)
      }
    } finally {
      setExportingId(null)
    }
  }

  const exportPdf = async (report: AnalysisSummary) => {
    setExportingId(report.id)

    try {
      const result = await getReportResult(report)
      if (result) {
        printAnalysisReport(report, result.variants)
      }
    } finally {
      setExportingId(null)
    }
  }

  const toggleCompare = (report: AnalysisSummary) => {
    if (report.status !== 'completed') {
      return
    }

    setCompareIds((current) => {
      if (current.includes(report.id)) {
        return current.filter((id) => id !== report.id)
      }

      if (current.length < 2) {
        return [...current, report.id]
      }

      return [current[1], report.id]
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="outline">Архив запусков</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
              История исследовательских запусков
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Фильтруйте архив по виду, статусу и формату, а затем сравнивайте
              два завершённых запуска по покрытию и пересечению вариантов.
            </p>
          </div>
          <Button asChild>
            <Link href="/upload">
              <Layers3 className="mr-2 h-4 w-4" />
              Новый анализ
            </Link>
          </Button>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <ReportMetric
            title="Завершено"
            value={`${completedReports.length}`}
            helper="В текущей выборке"
          />
          <ReportMetric
            title="В очереди"
            value={`${queuedReports.length}`}
            helper="Ожидают полной обработки"
          />
          <ReportMetric
            title="Средняя глубина"
            value={`${averageDepth.toFixed(1)}`}
            helper="По завершённым запускам"
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Фильтры архива</CardTitle>
            <CardDescription>
              Поиск по имени файла, идентификатору запуска, фокусному гену и
              статусу, плюс точные фильтры по виду, статусу и формату.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid items-end gap-3 xl:grid-cols-[minmax(0,1fr)_220px_180px_180px_140px]">
              <div className="space-y-2">
                <label
                  htmlFor="reports-search"
                  className="text-sm font-medium text-slate-300"
                >
                  Поиск по архиву
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    id="reports-search"
                    value={filters.search ?? ''}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        search: event.target.value,
                      }))
                    }
                    placeholder="ID запуска, файл, фокусный ген, статус"
                    className="border-genome-border bg-muted/40 focus:border-primary h-11 w-full rounded-2xl border pr-4 pl-11 text-sm text-white transition-colors outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="reports-species"
                  className="text-sm font-medium text-slate-300"
                >
                  Вид
                </label>
                <select
                  id="reports-species"
                  value={filters.speciesId ?? 'all'}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      speciesId: event.target
                        .value as ReportFilters['speciesId'],
                    }))
                  }
                  className="border-genome-border bg-muted/40 focus:border-primary h-11 w-full rounded-2xl border px-4 text-sm text-white transition-colors outline-none"
                >
                  <option value="all">Все виды</option>
                  {SPECIES_OPTIONS.map((species) => (
                    <option key={species.id} value={species.id}>
                      {species.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="reports-status"
                  className="text-sm font-medium text-slate-300"
                >
                  Статус
                </label>
                <select
                  id="reports-status"
                  value={filters.status ?? 'all'}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value as ReportFilters['status'],
                    }))
                  }
                  className="border-genome-border bg-muted/40 focus:border-primary h-11 w-full rounded-2xl border px-4 text-sm text-white transition-colors outline-none"
                >
                  <option value="all">Все статусы</option>
                  {Object.entries(STATUS_LABELS).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="reports-format"
                  className="text-sm font-medium text-slate-300"
                >
                  Формат
                </label>
                <select
                  id="reports-format"
                  value={filters.format ?? 'all'}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      format: event.target.value as ReportFilters['format'],
                    }))
                  }
                  className="border-genome-border bg-muted/40 focus:border-primary h-11 w-full rounded-2xl border px-4 text-sm text-white transition-colors outline-none"
                >
                  <option value="all">Все форматы</option>
                  {SUPPORTED_FORMATS.map((format) => (
                    <option key={format.label} value={format.label}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => setFilters(initialFilters)}
                  disabled={
                    !filters.search &&
                    (filters.speciesId ?? 'all') === 'all' &&
                    (filters.status ?? 'all') === 'all' &&
                    (filters.format ?? 'all') === 'all'
                  }
                >
                  Сбросить
                </Button>
              </div>
            </div>

            <p className="text-sm text-slate-500" aria-live="polite">
              Показано {filteredReports.length} из {reports.length} запусков.
              Для сравнения выберите два завершённых запуска.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Список запусков</CardTitle>
            <CardDescription>
              Открывайте панель анализа, выгружайте CSV/PDF и собирайте пару
              запусков для сравнения.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !reports.length ? (
              <div className="flex items-center gap-3 py-8 text-sm text-slate-400">
                <Spinner className="h-5 w-5" />
                Проверяю локальный архив запусков...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Запуск</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Вид</TableHead>
                    <TableHead>Фокусный ген</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.length ? (
                    filteredReports.map((report) => {
                      const isSelectedForCompare = compareIds.includes(
                        report.id,
                      )

                      return (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-white">
                                {report.fileName}
                              </span>
                              <span className="text-xs text-slate-500">
                                {report.id}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <Calendar className="h-3.5 w-3.5" />
                              {dateFormatter.format(new Date(report.date))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getSpeciesDefinition(report.speciesId).label} ·{' '}
                              {report.assemblyId}
                            </Badge>
                          </TableCell>
                          <TableCell>{report.focusGene}</TableCell>
                          <TableCell>{renderStatus(report.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                title="Открыть панель анализа"
                              >
                                <Link
                                  href={`/dashboard?id=${report.id}`}
                                  aria-label={`Открыть панель анализа для ${report.fileName}`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant={
                                  isSelectedForCompare ? 'secondary' : 'outline'
                                }
                                size="sm"
                                onClick={() => toggleCompare(report)}
                                disabled={
                                  report.status !== 'completed' &&
                                  !isSelectedForCompare
                                }
                                aria-pressed={isSelectedForCompare}
                                title={
                                  report.status === 'completed'
                                    ? 'Добавить в режим сравнения'
                                    : 'Сравнение доступно только для завершённых запусков'
                                }
                              >
                                <GitCompareArrows className="mr-2 h-4 w-4" />
                                {isSelectedForCompare ? 'Выбран' : 'Сравнить'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Скачать CSV"
                                aria-label={`Скачать CSV для ${report.fileName}`}
                                onClick={() => void exportCsv(report)}
                                disabled={
                                  exportingId === report.id ||
                                  report.status !== 'completed'
                                }
                              >
                                {exportingId === report.id ? (
                                  <Spinner className="h-4 w-4" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Печатный PDF"
                                aria-label={`Открыть PDF-версию для ${report.fileName}`}
                                onClick={() => void exportPdf(report)}
                                disabled={
                                  exportingId === report.id ||
                                  report.status !== 'completed'
                                }
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-10 text-center text-slate-500"
                      >
                        {reports.length
                          ? 'Под текущие фильтры запуски не найдены.'
                          : 'Архив пока пуст. Запустите первый анализ, чтобы он появился здесь.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            {error ? (
              <div
                className="border-destructive/20 bg-destructive/5 text-destructive mt-4 rounded-2xl border px-4 py-3 text-sm"
                role="alert"
              >
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <RunComparisonCard
          selectedReports={selectedReports}
          comparisonResults={comparisonResults}
          comparisonSummary={comparisonSummary}
          isLoading={comparisonLoading}
          error={comparisonError}
          onClear={() => setCompareIds([])}
        />

        <Card>
          <CardHeader>
            <CardTitle>Хранилище</CardTitle>
            <CardDescription>
              Реальная оценка локального persistent архива запусков.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-genome-border bg-muted/40 flex items-center gap-3 rounded-2xl border p-4">
              <HardDrive className="text-primary h-5 w-5" />
              <div>
                <p className="text-sm font-semibold text-white">
                  {storageUsedGb.toFixed(1)} GB
                </p>
                <p className="text-sm text-slate-400">
                  Суммарный размер текущей выборки
                </p>
              </div>
            </div>
            <div
              className="bg-genome-border h-2 overflow-hidden rounded-full"
              role="progressbar"
              aria-label="Заполнение локального хранилища"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(
                Math.min(100, (storageUsedGb / 50) * 100),
              )}
            >
              <div
                className="genome-gradient h-full rounded-full"
                style={{
                  width: `${Math.min(100, (storageUsedGb / 50) * 100)}%`,
                }}
              />
            </div>
            <p className="text-sm leading-6 text-slate-400">
              Архив строится из локального каталога `.phyto/`. Вместе с
              фильтрами выше этот блок помогает быстро оценить объём выбранного
              подмножества запусков.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последний завершённый запуск</CardTitle>
            <CardDescription>
              Быстрый доступ к самому свежему завершённому анализу в текущей
              выборке.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestCompletedReport ? (
              <div className="space-y-4">
                <div className="border-genome-border bg-muted/40 rounded-2xl border p-4">
                  <div className="flex items-center gap-2">
                    <Trees className="text-primary h-4 w-4" />
                    <p className="text-sm font-semibold text-white">
                      {latestCompletedReport.fileName}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {
                      getSpeciesDefinition(latestCompletedReport.speciesId)
                        .label
                    }{' '}
                    · {latestCompletedReport.focusGene} ·{' '}
                    {latestCompletedReport.highImpactVariants} вариантов с
                    высоким эффектом
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button asChild className="flex-1">
                    <Link href={`/dashboard?id=${latestCompletedReport.id}`}>
                      Открыть панель
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => void exportPdf(latestCompletedReport)}
                    disabled={exportingId === latestCompletedReport.id}
                  >
                    PDF
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                В текущей фильтрации нет завершённых запусков.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ReportMetric({
  title,
  value,
  helper,
}: {
  title: string
  value: string
  helper: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-slate-400">{title}</p>
        <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{helper}</p>
      </CardContent>
    </Card>
  )
}

function RunComparisonCard({
  selectedReports,
  comparisonResults,
  comparisonSummary,
  isLoading,
  error,
  onClear,
}: {
  selectedReports: AnalysisSummary[]
  comparisonResults: UploadAnalysisResult[]
  comparisonSummary: RunComparisonSummary | null
  isLoading: boolean
  error: string | null
  onClear: () => void
}) {
  const [leftResult, rightResult] = comparisonResults

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Сравнение запусков</CardTitle>
            <CardDescription>
              Выберите два завершённых запуска, чтобы сравнить пересечение
              вариантов, уникальные гены и ключевые метрики.
            </CardDescription>
          </div>
          {selectedReports.length ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="mr-2 h-4 w-4" />
              Очистить
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedReports.length === 0 ? (
          <EmptyPanel message="Сейчас режим сравнения пуст. Выберите два завершённых запуска из таблицы слева." />
        ) : null}

        {selectedReports.length === 1 ? (
          <div className="space-y-4">
            <SelectedRunCard report={selectedReports[0]} />
            <EmptyPanel message="Нужен ещё один завершённый запуск, чтобы посчитать пересечение и различия." />
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-3 py-6 text-sm text-slate-400">
            <Spinner className="h-5 w-5" />
            Подгружаю оба запуска для сравнения...
          </div>
        ) : null}

        {error ? (
          <div
            className="border-destructive/20 bg-destructive/5 text-destructive rounded-2xl border px-4 py-3 text-sm"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {selectedReports.length === 2 &&
        !isLoading &&
        !error &&
        comparisonSummary ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {leftResult ? (
                <ComparisonRunCard result={leftResult} side="A" />
              ) : null}
              {rightResult ? (
                <ComparisonRunCard result={rightResult} side="B" />
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <ComparisonMetric
                title="Общие варианты"
                value={`${comparisonSummary.sharedVariantCount}`}
                helper="Совпадающие геномные события"
              />
              <ComparisonMetric
                title="Общие гены"
                value={`${comparisonSummary.sharedGeneCount}`}
                helper="Общие затронутые гены"
              />
              <ComparisonMetric
                title="Варианты только A"
                value={`${comparisonSummary.leftOnlyVariantCount}`}
                helper="Уникальные для запуска A"
              />
              <ComparisonMetric
                title="Варианты только B"
                value={`${comparisonSummary.rightOnlyVariantCount}`}
                helper="Уникальные для запуска B"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DeltaCard
                title="Разница по метрикам"
                lines={[
                  `Количество вариантов: ${formatSignedDelta(comparisonSummary.variantCountDelta)}`,
                  `Высокий эффект: ${formatSignedDelta(comparisonSummary.highImpactDelta)}`,
                  `Средняя глубина: ${formatSignedDelta(comparisonSummary.meanDepthDelta)}`,
                  `Среднее качество: ${formatSignedDelta(comparisonSummary.meanQualityDelta)}`,
                ]}
              />
              <DeltaCard
                title="Пересечение генов"
                lines={[
                  `Общие гены: ${comparisonSummary.sharedGeneCount}`,
                  `Только в A: ${comparisonSummary.leftOnlyGeneCount}`,
                  `Только в B: ${comparisonSummary.rightOnlyGeneCount}`,
                ]}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <GeneBucket
                title="Общие гены"
                genes={comparisonSummary.sharedGenes}
              />
              <GeneBucket
                title="Гены только A"
                genes={comparisonSummary.leftOnlyGenes}
              />
              <GeneBucket
                title="Гены только B"
                genes={comparisonSummary.rightOnlyGenes}
              />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function SelectedRunCard({ report }: { report: AnalysisSummary }) {
  return (
    <div className="border-genome-border bg-muted/40 rounded-2xl border p-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline">Выбран</Badge>
        <p className="text-sm font-semibold text-white">{report.fileName}</p>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        {report.id} · {getSpeciesDefinition(report.speciesId).label} ·{' '}
        {report.focusGene}
      </p>
    </div>
  )
}

function ComparisonRunCard({
  result,
  side,
}: {
  result: UploadAnalysisResult
  side: 'A' | 'B'
}) {
  const report = result.summary

  return (
    <div className="border-genome-border bg-muted/40 rounded-2xl border p-4">
      <div className="flex items-center gap-2">
        <Badge variant={side === 'A' ? 'secondary' : 'outline'}>
          Запуск {side}
        </Badge>
        <p className="text-sm font-semibold text-white">{report.fileName}</p>
      </div>
      <p className="mt-2 text-xs text-slate-500">{report.id}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ComparisonField
          label="Вид"
          value={`${getSpeciesDefinition(report.speciesId).label} · ${report.assemblyId}`}
        />
        <ComparisonField label="Формат" value={report.format} />
        <ComparisonField label="Фокусный ген" value={report.focusGene} />
        <ComparisonField label="Варианты" value={`${report.variantCount}`} />
        <ComparisonField
          label="Высокий эффект"
          value={`${report.highImpactVariants}`}
        />
        <ComparisonField
          label="Средняя глубина"
          value={`${report.meanDepth.toFixed(1)}`}
        />
      </div>
    </div>
  )
}

function ComparisonField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-[0.18em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

function ComparisonMetric({
  title,
  value,
  helper,
}: {
  title: string
  value: string
  helper: string
}) {
  return (
    <div className="border-genome-border bg-muted/40 rounded-2xl border p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  )
}

function DeltaCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="border-genome-border bg-muted/40 rounded-2xl border p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 space-y-2">
        {lines.map((line) => (
          <p key={line} className="text-sm text-slate-400">
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

function GeneBucket({ title, genes }: { title: string; genes: string[] }) {
  return (
    <div className="border-genome-border bg-muted/40 rounded-2xl border p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      {genes.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {genes.slice(0, 8).map((gene) => (
            <Badge key={gene} variant="outline">
              {gene}
            </Badge>
          ))}
          {genes.length > 8 ? (
            <Badge variant="outline">+{genes.length - 8}</Badge>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Список пуст.</p>
      )}
    </div>
  )
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="border-genome-border bg-muted/30 flex min-h-28 items-center justify-center rounded-3xl border border-dashed px-4 text-center text-sm text-slate-500">
      {message}
    </div>
  )
}

function formatSignedDelta(value: number) {
  if (value > 0) {
    return `+${value}`
  }

  return `${value}`
}

function renderStatus(status: AnalysisSummary['status']) {
  if (status === 'completed') {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        Завершён
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-400">
        <Clock3 className="h-4 w-4" />В обработке
      </div>
    )
  }

  if (status === 'queued') {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-400">
        <Clock3 className="h-4 w-4" />В очереди
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-rose-400">
      <XCircle className="h-4 w-4" />С ошибкой
    </div>
  )
}
