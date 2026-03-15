'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  HardDrive,
  Layers3,
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
import { downloadVariantsCsv, printAnalysisReport } from '@/lib/exporters'
import { genomeApi } from '@/services/genomeApi'
import type { AnalysisSummary, GenomeVariant } from '@/types/genome'

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export default function ReportsPage() {
  const { reports, variantsByAnalysis, isLoading, error, fetchReports } =
    useAnalysisStore()
  const [exportingId, setExportingId] = useState<string | null>(null)

  useEffect(() => {
    if (!reports.length) {
      void fetchReports()
    }
  }, [fetchReports, reports.length])

  const completedReports = reports.filter((report) => report.status === 'completed')
  const processingReports = reports.filter((report) => report.status === 'processing')
  const storageUsedGb = useMemo(
    () => reports.reduce((sum, report) => sum + report.fileSizeMb, 0) / 1024,
    [reports],
  )
  const averageCoverage = useMemo(() => {
    if (!completedReports.length) {
      return 0
    }

    return (
      completedReports.reduce((sum, report) => sum + report.coverage, 0) /
      completedReports.length
    )
  }, [completedReports])

  const latestCompletedReport = completedReports[0] ?? null

  const getReportVariants = async (report: AnalysisSummary): Promise<GenomeVariant[]> => {
    if (variantsByAnalysis[report.id]) {
      return variantsByAnalysis[report.id]
    }

    return genomeApi.getVariants(report.id)
  }

  const exportCsv = async (report: AnalysisSummary) => {
    setExportingId(report.id)

    try {
      const variants = await getReportVariants(report)
      downloadVariantsCsv(report, variants)
    } finally {
      setExportingId(null)
    }
  }

  const exportPdf = async (report: AnalysisSummary) => {
    setExportingId(report.id)

    try {
      const variants = await getReportVariants(report)
      printAnalysisReport(report, variants)
    } finally {
      setExportingId(null)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="outline">Reports archive</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
              История отчётов
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Завершённые анализы, активные прогоны и быстрый экспорт результатов.
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
          <ReportMetric title="Completed" value={`${completedReports.length}`} helper="Готовы для экспорта" />
          <ReportMetric title="Processing" value={`${processingReports.length}`} helper="Активные или ожидающие" />
          <ReportMetric title="Avg coverage" value={`${averageCoverage.toFixed(1)}x`} helper="По завершённым отчётам" />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Список анализов</CardTitle>
            <CardDescription>
              Открывайте дашборд, выгружайте CSV и печатайте PDF напрямую из истории.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !reports.length ? (
              <div className="flex items-center gap-3 py-8 text-sm text-slate-400">
                <Spinner className="h-5 w-5" />
                Загрузка архива отчётов...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Формат</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Coverage</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">{report.fileName}</span>
                          <span className="text-xs text-slate-500">{report.id}</span>
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
                          {report.format} · {report.genomeBuild}
                        </Badge>
                      </TableCell>
                      <TableCell>{renderStatus(report.status)}</TableCell>
                      <TableCell>{report.coverage ? `${report.coverage}x` : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="ghost" size="icon" title="Открыть дашборд">
                            <Link href={`/dashboard?id=${report.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Скачать CSV"
                            onClick={() => void exportCsv(report)}
                            disabled={exportingId === report.id || report.status !== 'completed'}
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
                            onClick={() => void exportPdf(report)}
                            disabled={exportingId === report.id || report.status !== 'completed'}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {error ? (
              <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Хранилище</CardTitle>
            <CardDescription>
              Простой контроль объёма данных, сохранённых в истории отчётов.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-genome-border bg-muted/40 p-4">
              <HardDrive className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-white">
                  {storageUsedGb.toFixed(1)} GB
                </p>
                <p className="text-sm text-slate-400">Суммарный размер локального архива</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-genome-border">
              <div
                className="h-full rounded-full genome-gradient"
                style={{ width: `${Math.min(100, (storageUsedGb / 50) * 100)}%` }}
              />
            </div>
            <p className="text-sm leading-6 text-slate-400">
              В интерфейсе заложена логика хранения и масштабирования истории анализов.
              При подключении backend можно заменить этот блок на реальные квоты и архивацию.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Последний завершённый отчёт</CardTitle>
            <CardDescription>
              Быстрый доступ к самому свежему completed-run.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestCompletedReport ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-genome-border bg-muted/40 p-4">
                  <p className="text-sm font-semibold text-white">
                    {latestCompletedReport.fileName}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {latestCompletedReport.variantCount.toLocaleString('ru-RU')} вариантов ·{' '}
                    {latestCompletedReport.coverage}x coverage
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button asChild className="flex-1">
                    <Link href={`/dashboard?id=${latestCompletedReport.id}`}>
                      Открыть дашборд
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
              <p className="text-sm text-slate-400">Готовых отчётов пока нет.</p>
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
        <Clock3 className="h-4 w-4" />
        В обработке
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-rose-400">
      <XCircle className="h-4 w-4" />
      С ошибкой
    </div>
  )
}
