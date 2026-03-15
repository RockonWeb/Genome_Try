'use client'

import Link from 'next/link'
import { Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Download,
  Dna,
  Filter,
  Microscope,
  Search,
  ShieldAlert,
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
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAnalysisStore } from '@/hooks/useAnalysisStore'
import { downloadVariantsCsv, printAnalysisReport } from '@/lib/exporters'
import {
  CLINICAL_SIGNIFICANCE_OPTIONS,
  MUTATION_TYPE_OPTIONS,
} from '@/lib/constants'
import { analysisService } from '@/services/analysisService'
import type { ChartData, GenomeVariant, ManhattanPoint } from '@/types/genome'

const numberFormatter = new Intl.NumberFormat('ru-RU')

const impactBadgeVariant: Record<
  GenomeVariant['impact'],
  'destructive' | 'secondary' | 'outline'
> = {
  High: 'destructive',
  Moderate: 'secondary',
  Low: 'outline',
}

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
    reports,
    isLoading,
    error,
    fetchReports,
    fetchAnalysisResults,
  } = useAnalysisStore()

  const [search, setSearch] = useState('')
  const [chromosome, setChromosome] = useState('all')
  const [mutationType, setMutationType] = useState<'all' | GenomeVariant['type']>('all')
  const [clinicalSignificance, setClinicalSignificance] = useState<
    'all' | GenomeVariant['clinicalSignificance']
  >('all')
  const [selectedVariant, setSelectedVariant] = useState<GenomeVariant | null>(null)

  const deferredSearch = useDeferredValue(search)
  const analysisId =
    searchParams.get('id') ?? currentAnalysis?.id ?? reports[0]?.id ?? null

  useEffect(() => {
    if (!reports.length) {
      void fetchReports()
    }
  }, [fetchReports, reports.length])

  useEffect(() => {
    if (analysisId && (analysisId !== currentAnalysis?.id || !variants.length)) {
      void fetchAnalysisResults(analysisId)
    }
  }, [analysisId, currentAnalysis?.id, fetchAnalysisResults, variants.length])

  const chromosomeOptions = useMemo(
    () =>
      [...new Set(variants.map((variant) => variant.chromosome))].sort((left, right) =>
        left.localeCompare(right, undefined, { numeric: true }),
      ),
    [variants],
  )

  const filteredVariants = useMemo(
    () =>
      analysisService.filterVariants(variants, {
        search: deferredSearch,
        chromosome,
        type: mutationType,
        clinicalSignificance,
      }),
    [chromosome, clinicalSignificance, deferredSearch, mutationType, variants],
  )

  const hasActiveFilters =
    Boolean(deferredSearch) ||
    chromosome !== 'all' ||
    mutationType !== 'all' ||
    clinicalSignificance !== 'all'

  const activeVariants = hasActiveFilters ? filteredVariants : variants
  const chromosomeData = useMemo(
    () => analysisService.calculateChromosomeDistribution(activeVariants),
    [activeVariants],
  )
  const mutationData = useMemo(
    () => analysisService.calculateMutationTypeStats(activeVariants),
    [activeVariants],
  )
  const manhattanData = useMemo(
    () => analysisService.buildManhattanPoints(activeVariants),
    [activeVariants],
  )

  const meanDepth = useMemo(() => {
    if (!activeVariants.length) {
      return 0
    }

    return Math.round(
      activeVariants.reduce((sum, variant) => sum + variant.depth, 0) /
        activeVariants.length,
    )
  }, [activeVariants])

  const loadingInitial = isLoading && !currentAnalysis

  if (loadingInitial) {
    return <DashboardLoadingState />
  }

  if (!currentAnalysis) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="flex flex-col items-center gap-5 py-14 text-center">
          <Microscope className="h-10 w-10 text-primary" />
          <div>
            <p className="text-xl font-semibold text-white">Нет доступного анализа</p>
            <p className="mt-2 text-sm text-slate-400">
              Запустите новый pipeline или откройте один из готовых отчётов из истории.
            </p>
          </div>
          <Button asChild>
            <Link href="/upload">Перейти к загрузке</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const handleExportCsv = () => {
    downloadVariantsCsv(currentAnalysis, activeVariants)
  }

  const handleExportPdf = () => {
    printAnalysisReport(currentAnalysis, activeVariants)
  }

  if (currentAnalysis.status !== 'completed') {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Статус анализа
          </Badge>
          <CardTitle className="text-3xl">
            Этот запуск ещё не готов к полной визуализации
          </CardTitle>
          <CardDescription>
            Для completed-отчётов дашборд показывает Manhattan plot, фильтры и
            таблицу приоритетных вариантов.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-2xl border border-genome-border bg-muted/40 p-4 text-sm text-slate-300">
            Текущий статус:{' '}
            <span className="font-semibold text-white">{currentAnalysis.status}</span>
          </div>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/reports">Открыть историю отчётов</Link>
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <Badge variant="success">Sample {currentAnalysis.sampleId}</Badge>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            Аналитический дашборд
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {currentAnalysis.fileName} · {currentAnalysis.format} · {currentAnalysis.genomeBuild}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Tooltip content="Экспортировать текущий набор вариантов в CSV">
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </Tooltip>
          <Tooltip content="Открыть печатный отчёт и сохранить как PDF">
            <Button onClick={handleExportPdf}>
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </Tooltip>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Всего вариантов"
          value={numberFormatter.format(currentAnalysis.variantCount)}
          helper="Суммарный объём по run summary"
          icon={Activity}
          accent="text-secondary"
        />
        <MetricCard
          title="High impact"
          value={numberFormatter.format(currentAnalysis.highImpactVariants)}
          helper="Приоритет для follow-up"
          icon={ShieldAlert}
          accent="text-rose-400"
        />
        <MetricCard
          title="Pathogenic"
          value={numberFormatter.format(currentAnalysis.pathogenicVariants)}
          helper="ClinVar-like интерпретация"
          icon={Microscope}
          accent="text-primary"
        />
        <MetricCard
          title="Coverage"
          value={`${currentAnalysis.coverage}x`}
          helper={`Средняя глубина ${meanDepth} reads`}
          icon={Dna}
          accent="text-amber-400"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Manhattan plot</CardTitle>
            <CardDescription>
              Локальный SVG-график по клинически приоритизированным вариантам.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ManhattanChart points={manhattanData} />
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Хромосомное распределение</CardTitle>
              <CardDescription>Количество приоритетных вариантов по хромосомам.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChromosomeChart data={chromosomeData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Типы мутаций</CardTitle>
              <CardDescription>
                Распределение SNV, insertion, deletion и CNV в текущем представлении.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MutationDonut data={mutationData} />
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Таблица приоритетных вариантов</CardTitle>
              <CardDescription>
                Поиск, фильтры и просмотр детальной карточки варианта через модальное окно.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
              <Filter className="h-4 w-4" />
              {numberFormatter.format(activeVariants.length)} показано
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по гену, ID или транскрипту"
                className="w-full rounded-2xl border border-genome-border bg-muted/40 py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors focus:border-primary"
              />
            </label>

            <SelectControl
              value={chromosome}
              onChange={setChromosome}
              options={[
                { label: 'Все хромосомы', value: 'all' },
                ...chromosomeOptions.map((item) => ({ label: item, value: item })),
              ]}
            />

            <SelectControl
              value={mutationType}
              onChange={(value) =>
                setMutationType(value as 'all' | GenomeVariant['type'])
              }
              options={MUTATION_TYPE_OPTIONS.map((item) => ({
                label: item.label,
                value: item.id,
              }))}
            />

            <SelectControl
              value={clinicalSignificance}
              onChange={(value) =>
                setClinicalSignificance(
                  value as 'all' | GenomeVariant['clinicalSignificance'],
                )
              }
              options={CLINICAL_SIGNIFICANCE_OPTIONS.map((item) => ({
                label: item.label,
                value: item.id,
              }))}
            />
          </div>

          {hasActiveFilters ? (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setChromosome('all')
                  setMutationType('all')
                  setClinicalSignificance('all')
                }}
              >
                Сбросить фильтры
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gene / ID</TableHead>
                <TableHead>Локация</TableHead>
                <TableHead>Изменение</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Significance</TableHead>
                <TableHead>Depth</TableHead>
                <TableHead className="text-right">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeVariants.length ? (
                activeVariants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{variant.gene}</span>
                        <span className="font-mono text-xs text-slate-500">{variant.id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">
                      {variant.chromosome}:{numberFormatter.format(variant.position)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">
                      {variant.reference} {'>'} {variant.alternate}
                    </TableCell>
                    <TableCell>{variant.type}</TableCell>
                    <TableCell>
                      <Badge variant={impactBadgeVariant[variant.impact]}>
                        {variant.impact}
                      </Badge>
                    </TableCell>
                    <TableCell>{variant.clinicalSignificance}</TableCell>
                    <TableCell>{variant.depth}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedVariant(variant)}
                      >
                        Детали
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                    По текущим фильтрам варианты не найдены.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal
        isOpen={Boolean(selectedVariant)}
        onClose={() => setSelectedVariant(null)}
        title={selectedVariant ? `${selectedVariant.gene} · ${selectedVariant.id}` : ''}
        className="max-w-2xl"
      >
        {selectedVariant ? (
          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard
              label="Позиция"
              value={`${selectedVariant.chromosome}:${numberFormatter.format(selectedVariant.position)}`}
            />
            <DetailCard label="Транскрипт" value={selectedVariant.transcript} />
            <DetailCard
              label="Изменение"
              value={`${selectedVariant.reference} > ${selectedVariant.alternate}`}
            />
            <DetailCard label="Качество" value={`${selectedVariant.quality}`} />
            <DetailCard label="Impact" value={selectedVariant.impact} />
            <DetailCard
              label="Clinical significance"
              value={selectedVariant.clinicalSignificance}
            />
            <DetailCard label="Depth" value={`${selectedVariant.depth} reads`} />
            <DetailCard
              label="-log10(p)"
              value={`${(-Math.log10(selectedVariant.pValue)).toFixed(2)}`}
            />
            <div className="rounded-2xl border border-genome-border bg-muted/40 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Комментарий
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                {selectedVariant.notes}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function DashboardLoadingState() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
        <Spinner className="h-8 w-8" />
        <div>
          <p className="text-lg font-semibold text-white">Подгружаю анализ</p>
          <p className="mt-2 text-sm text-slate-400">
            Готовлю сводку, варианты и графики для текущего образца.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  accent,
}: {
  title: string
  value: string
  helper: string
  icon: LucideIcon
  accent: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-6">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={`rounded-2xl bg-muted/60 p-3 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}

function SelectControl({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-genome-border bg-muted/40 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-genome-border bg-muted/40 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

function ManhattanChart({ points }: { points: ManhattanPoint[] }) {
  if (!points.length) {
    return <EmptyChart message="Нет данных для Manhattan plot." />
  }

  const width = 900
  const height = 320
  const padding = { top: 16, right: 16, bottom: 28, left: 36 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const maxScore = Math.max(...points.map((point) => point.score), 1)

  return (
    <div className="overflow-hidden rounded-3xl border border-genome-border bg-muted/30 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full">
        {[0, 1, 2, 3].map((row) => {
          const y = padding.top + (chartHeight / 3) * row

          return (
            <line
              key={row}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#22304b"
              strokeDasharray="4 6"
            />
          )
        })}

        {points.map((point, index) => {
          const x =
            padding.left +
            (index / Math.max(points.length - 1, 1)) * chartWidth
          const y =
            padding.top + chartHeight - (point.score / maxScore) * chartHeight

          return (
            <g key={point.id}>
              <circle cx={x} cy={y} r={5} fill={point.fill} opacity="0.95" />
              <title>{`${point.gene} · ${point.chromosome} · ${point.score}`}</title>
            </g>
          )
        })}

        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={height - padding.bottom}
          y2={height - padding.bottom}
          stroke="#334155"
        />
        <line
          x1={padding.left}
          x2={padding.left}
          y1={padding.top}
          y2={height - padding.bottom}
          stroke="#334155"
        />
        <text
          x={width / 2}
          y={height - 4}
          fill="#94a3b8"
          fontSize="12"
          textAnchor="middle"
        >
          Упорядоченная геномная координата
        </text>
        <text
          x={18}
          y={height / 2}
          fill="#94a3b8"
          fontSize="12"
          textAnchor="middle"
          transform={`rotate(-90 18 ${height / 2})`}
        >
          -log10(p)
        </text>
      </svg>
    </div>
  )
}

function ChromosomeChart({ data }: { data: ChartData[] }) {
  if (!data.length) {
    return <EmptyChart message="Нет данных по хромосомам." />
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="flex h-[220px] items-end gap-3">
      {data.map((item) => (
        <div key={item.name} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-44 w-full items-end rounded-2xl bg-muted/50 p-2">
            <div
              className="w-full rounded-xl transition-all"
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                background: item.fill ?? '#2dd4bf',
              }}
              title={`${item.name}: ${item.value}`}
            />
          </div>
          <span className="text-xs text-slate-400">{item.name}</span>
        </div>
      ))}
    </div>
  )
}

function MutationDonut({ data }: { data: ChartData[] }) {
  if (!data.length) {
    return <EmptyChart message="Нет данных по типам мутаций." />
  }

  const total = data.reduce((sum, item) => sum + item.value, 0)
  const circumference = 2 * Math.PI * 56
  const segments = data.reduce<
    Array<ChartData & { segment: number; strokeOffset: number }>
  >((acc, item) => {
    const segment = (item.value / total) * circumference
    const strokeOffset = acc.length
      ? acc[acc.length - 1].strokeOffset + acc[acc.length - 1].segment
      : 0

    return [...acc, { ...item, segment, strokeOffset }]
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-center">
      <svg viewBox="0 0 180 180" className="mx-auto h-44 w-44">
        <circle
          cx="90"
          cy="90"
          r="56"
          fill="none"
          stroke="#18233a"
          strokeWidth="18"
        />
        <g transform="rotate(-90 90 90)">
          {segments.map((item) => (
            <circle
              key={item.name}
              cx="90"
              cy="90"
              r="56"
              fill="none"
              stroke={item.fill ?? '#2dd4bf'}
              strokeWidth="18"
              strokeDasharray={`${item.segment} ${circumference - item.segment}`}
              strokeDashoffset={-item.strokeOffset}
              strokeLinecap="round"
            />
          ))}
        </g>
        <text
          x="90"
          y="84"
          fill="#f8fafc"
          fontSize="26"
          fontWeight="700"
          textAnchor="middle"
        >
          {total}
        </text>
        <text x="90" y="108" fill="#94a3b8" fontSize="12" textAnchor="middle">
          variants
        </text>
      </svg>

      <div className="space-y-3">
        {data.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-2xl border border-genome-border bg-muted/40 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: item.fill ?? '#2dd4bf' }}
              />
              <span className="text-sm text-white">{item.name}</span>
            </div>
            <span className="text-sm text-slate-400">
              {Math.round((item.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-3xl border border-dashed border-genome-border bg-muted/30 text-sm text-slate-500">
      {message}
    </div>
  )
}
