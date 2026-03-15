'use client'

import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  ExternalLink,
  Leaf,
  Link2,
  Microscope,
  Orbit,
  Route,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { analysisService } from '@/services/analysisService'
import type { AnalysisSummary, ChartData, GenomeContextPoint, WorkbenchData } from '@/types/genome'

const numberFormatter = new Intl.NumberFormat('ru-RU')

const healthClasses = {
  online: 'bg-emerald-500/10 text-emerald-300',
  degraded: 'bg-amber-500/10 text-amber-300',
  offline: 'bg-rose-500/10 text-rose-300',
} as const

export function WorkbenchResults({
  workbench,
  summary,
  title,
}: {
  workbench: WorkbenchData
  summary?: AnalysisSummary | null
  title?: string
}) {
  const chromosomeData = analysisService.calculateChromosomeDistribution(workbench.variants)
  const impactData = analysisService.calculateImpactDistribution(workbench.variants)
  const contextPoints = analysisService.buildGenomeContextPoints(workbench.variants)

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              {title ?? 'Unified research view'}
            </Badge>
            <CardTitle className="text-3xl">
              {workbench.gene
                ? `${workbench.gene.symbol} · ${workbench.gene.id}`
                : workbench.query.normalized}
            </CardTitle>
            <CardDescription className="max-w-3xl">
              {workbench.gene?.description ??
                'Собранный workbench объединяет plant-aware variant context, expression, regulation и литературу.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{workbench.species.label}</Badge>
              <Badge variant="outline">{workbench.query.type}</Badge>
              {workbench.gene ? <Badge variant="outline">{workbench.gene.assemblyId}</Badge> : null}
              {summary ? <Badge variant="outline">{summary.fileName}</Badge> : null}
            </div>

            {workbench.gene ? (
              <div className="grid gap-3 md:grid-cols-2">
                <MetaCard label="Локус" value={`${workbench.gene.location.chromosome}:${numberFormatter.format(workbench.gene.location.start)}-${numberFormatter.format(workbench.gene.location.end)}`} />
                <MetaCard label="Биотип" value={workbench.gene.biotype} />
                <MetaCard label="Алиасы" value={workbench.gene.aliases.slice(0, 4).join(', ') || '—'} />
                <MetaCard label="Источники" value={workbench.gene.sourceSummaries.map((item) => item.label).join(', ')} />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {workbench.supportingLinks.slice(0, 4).map((link) => (
                <Button key={link.url} asChild variant="outline" size="sm">
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source status</CardTitle>
            <CardDescription>
              Любой источник может деградировать до partial cards, но не ломает страницу.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workbench.sourceStatus.map((status) => (
              <div
                key={status.source}
                className="rounded-2xl border border-genome-border bg-muted/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{status.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{status.detail}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${healthClasses[status.status]}`}>
                    {status.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Leaf}
          title="Variant context"
          value={`${workbench.variants.length}`}
          helper="локальных или загруженных variant cards"
          accent="text-lime-300"
        />
        <MetricCard
          icon={Microscope}
          title="Expression"
          value={`${workbench.expression?.tissues.length ?? 0}`}
          helper="tissue/condition signals in view"
          accent="text-sky-300"
        />
        <MetricCard
          icon={Route}
          title="Regulation"
          value={`${workbench.regulation.length}`}
          helper="evidence cards for regulatory interpretation"
          accent="text-amber-300"
        />
        <MetricCard
          icon={BookOpen}
          title="Literature"
          value={`${workbench.literature.length}`}
          helper="recent evidence links from Europe PMC"
          accent="text-rose-300"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Expression</CardTitle>
            <CardDescription>
              Приоритетный слой для Arabidopsis-first interpretation: tissues, contexts и atlas cues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workbench.expression ? (
              <ExpressionBlock workbench={workbench} />
            ) : (
              <EmptyPanel message="Для этого запроса нет структурированного expression payload." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regulation</CardTitle>
            <CardDescription>
              Сводка кураторских, computational и literature-backed regulatory signals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workbench.regulation.length ? (
              workbench.regulation.map((item) => (
                <div
                  key={`${item.source}-${item.title}`}
                  className="rounded-2xl border border-genome-border bg-muted/40 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <Badge variant="outline">{item.evidenceType}</Badge>
                    <Badge variant="outline">{item.source}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.summary}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Score {item.score} · {item.tags.join(' · ')}
                  </p>
                </div>
              ))
            ) : (
              <EmptyPanel message="Регуляторные evidence cards пока недоступны." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Genome context</CardTitle>
            <CardDescription>
              Локусный контекст по текущим variant cards вместо дефолтного clinical Manhattan plot.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {contextPoints.length ? (
              <GenomeContextTrack points={contextPoints} />
            ) : (
              <EmptyPanel message="Нет локальных variant cards для genome context." />
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <ChartCard title="По хромосомам" data={chromosomeData} />
              <ChartCard title="По impact" data={impactData} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Function / GO</CardTitle>
            <CardDescription>
              Ontology-backed terms, plant ontology and high-signal function cues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workbench.functionTerms.length ? (
              workbench.functionTerms.map((term) => (
                <div
                  key={`${term.id}-${term.label}`}
                  className="rounded-2xl border border-genome-border bg-muted/40 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{term.category}</Badge>
                    <p className="text-sm font-semibold text-white">{term.label}</p>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {term.id} · {term.source}
                  </p>
                </div>
              ))
            ) : (
              <EmptyPanel message="Function terms пока не собраны." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <EntityListCard
          icon={Link2}
          title="Interactions"
          description="Партнёры, co-context genes и interaction-like links."
          items={workbench.interactions.map((item) => ({
            title: item.partnerLabel,
            body: item.relation,
            meta: `${item.source}${item.confidence ? ` · confidence ${item.confidence}` : ''}`,
          }))}
          emptyMessage="Нет interaction cards для текущего запроса."
        />
        <EntityListCard
          icon={Orbit}
          title="Orthology"
          description="Быстрый comparative context по orthologues."
          items={workbench.orthology.map((item) => ({
            title: item.speciesLabel,
            body: `${item.geneLabel} · ${item.relationship}`,
            meta: `${item.source}${item.confidence ? ` · confidence ${item.confidence}` : ''}`,
          }))}
          emptyMessage="Orthology not available for this context."
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Evidence / literature</CardTitle>
          <CardDescription>
            Curated summaries + links without превращения интерфейса в отдельный literature workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          {workbench.literature.length ? (
            workbench.literature.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-genome-border bg-muted/40 p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.year}</Badge>
                  <Badge variant="outline">{item.journal}</Badge>
                </div>
                <p className="mt-3 text-base font-semibold text-white">{item.title}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.snippet}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {item.authors.join(', ')}
                  {item.citedByCount ? ` · cited by ${item.citedByCount}` : ''}
                </p>
              </a>
            ))
          ) : (
            <EmptyPanel message="Литературные карточки пока не собраны." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variant context</CardTitle>
          <CardDescription>
            Variant-first и upload-first сценарии сходятся здесь в одном plant-aware table view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gene</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Consequences</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workbench.variants.length ? (
                workbench.variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{variant.geneSymbol}</span>
                        <span className="font-mono text-xs text-slate-500">{variant.geneId ?? variant.id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">
                      {variant.chromosome}:{numberFormatter.format(variant.position)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">
                      {variant.reference} {'>'} {variant.alternate}
                    </TableCell>
                    <TableCell>
                      <Badge variant={variant.predictedImpact === 'HIGH' ? 'destructive' : variant.predictedImpact === 'MODERATE' ? 'secondary' : 'outline'}>
                        {variant.predictedImpact}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-300">
                      {variant.consequenceTerms.join(', ')}
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">{variant.source}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                    Для текущего контекста variant cards не найдены.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
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

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-genome-border bg-muted/40 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-3xl border border-dashed border-genome-border bg-muted/30 px-4 text-center text-sm text-slate-500">
      {message}
    </div>
  )
}

function ExpressionBlock({ workbench }: { workbench: WorkbenchData }) {
  const expression = workbench.expression
  if (!expression) {
    return null
  }

  const maxValue = Math.max(
    ...expression.tissues.map((item) => item.value),
    ...expression.conditions.map((item) => item.value),
    1,
  )

  return (
    <div className="space-y-5">
      <p className="text-sm leading-7 text-slate-300">{expression.summary}</p>

      <div className="space-y-3">
        {expression.tissues.map((item) => (
          <div key={`${item.label}-${item.context}`} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white">{item.label}</span>
              <span className="text-slate-400">
                {item.value} {item.unit}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-genome-border">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#7dd3fc,#34d399)]"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {item.context}
            </p>
          </div>
        ))}
      </div>

      {expression.conditions.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {expression.conditions.map((item) => (
            <div
              key={`${item.label}-${item.context}`}
              className="rounded-2xl border border-genome-border bg-muted/40 p-4"
            >
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-sky-300">
                {item.value} {item.unit}
              </p>
              <p className="mt-2 text-sm text-slate-400">{item.context}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ChartCard({ title, data }: { title: string; data: ChartData[] }) {
  if (!data.length) {
    return <EmptyPanel message={`${title}: нет данных.`} />
  }

  const maxValue = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="rounded-3xl border border-genome-border bg-muted/30 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 flex h-36 items-end gap-3">
        {data.map((item) => (
          <div key={item.name} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end rounded-2xl bg-muted/60 p-2">
              <div
                className="w-full rounded-xl"
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                  background: item.fill ?? '#7dd3fc',
                }}
              />
            </div>
            <span className="text-xs text-slate-400">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GenomeContextTrack({ points }: { points: GenomeContextPoint[] }) {
  const width = 880
  const height = 220
  const padding = { top: 12, right: 16, bottom: 28, left: 34 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const maxScore = Math.max(...points.map((point) => point.score), 1)

  return (
    <div className="overflow-hidden rounded-3xl border border-genome-border bg-muted/30 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
        {[0, 1, 2, 3].map((row) => {
          const y = padding.top + (chartHeight / 3) * row
          return (
            <line
              key={row}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#1f2937"
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
              <circle cx={x} cy={y} r={5} fill={point.fill} />
              <title>{`${point.geneSymbol} · ${point.chromosome}:${point.position}`}</title>
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
        <text
          x={width / 2}
          y={height - 6}
          fill="#94a3b8"
          fontSize="12"
          textAnchor="middle"
        >
          Упорядоченный genome context
        </text>
      </svg>
    </div>
  )
}

function EntityListCard({
  icon: Icon,
  title,
  description,
  items,
  emptyMessage,
}: {
  icon: LucideIcon
  title: string
  description: string
  items: Array<{ title: string; body: string; meta: string }>
  emptyMessage: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-muted/60 p-3 text-secondary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${item.title}-${item.meta}`}
              className="rounded-2xl border border-genome-border bg-muted/40 p-4"
            >
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">{item.body}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                {item.meta}
              </p>
            </div>
          ))
        ) : (
          <EmptyPanel message={emptyMessage} />
        )}
      </CardContent>
    </Card>
  )
}
