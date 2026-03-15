import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  FlaskConical,
  Leaf,
  LibraryBig,
  ScanSearch,
  Upload,
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
import { DNABackgroundClient } from '@/components/ui/DNABackgroundClient'
import { SAMPLE_QUERIES, SPECIES_OPTIONS, SUPPORTED_FORMATS } from '@/lib/constants'

const featureCards = [
  {
    title: 'Dual-mode workbench',
    description:
      'Равноправные входы через gene/locus/variant search и через upload pipeline.',
    icon: ScanSearch,
    accent: 'text-sky-300',
  },
  {
    title: 'Arabidopsis-first depth',
    description:
      'Expression, regulation, ontology, literature и orthology собраны в один plant research view.',
    icon: Leaf,
    accent: 'text-lime-300',
  },
  {
    title: 'Live online sources',
    description:
      'Ensembl Plants, BAR ThaleMine, Expression Atlas и Europe PMC подключены как основные open sources.',
    icon: FlaskConical,
    accent: 'text-amber-300',
  },
  {
    title: 'Upload-aware evidence',
    description:
      'VCF-аннотация больше не клиническая: последствия, effect terms и source-aware notes ориентированы на plant genomics.',
    icon: BookOpen,
    accent: 'text-rose-300',
  },
]

export default function Home() {
  return (
    <div className="flex flex-col gap-8 py-2">
      <section className="relative overflow-hidden rounded-[2rem] border border-genome-border bg-card px-6 py-10 md:px-10 md:py-14">
        <DNABackgroundClient />
        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">Arabidopsis-first</Badge>
            <Badge variant="outline">Plant genomics workbench</Badge>
            <Badge variant="outline">Live source aggregation</Badge>
          </div>

          <div className="max-w-5xl">
            <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">
              PhytoScope собирает максимум полезной информации для plant genomics research.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              Интерфейс объединяет variant context, gene function, expression,
              regulation, orthology и literature evidence. Первая версия
              оптимизирована под <span className="font-semibold text-white">Arabidopsis thaliana</span>, но
              сохраняет species-generic архитектуру для других растений.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/workbench">
                Открыть workbench
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
              <Link href="/upload">
                Upload pipeline
                <Upload className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 px-8 text-base">
              <Link href="/literature">
                Literature workspace
                <LibraryBig className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle>{SAMPLE_QUERIES.length} sample queries</CardTitle>
                <CardDescription>
                  Gene, locus и variant-first entry points готовы в workbench.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle>{SUPPORTED_FORMATS.length} upload formats</CardTitle>
                <CardDescription>
                  Plant-aware upload flow поддерживает VCF, FASTA, BAM и BED.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle>{SPECIES_OPTIONS.length} supported species presets</CardTitle>
                <CardDescription>
                  Arabidopsis с полной глубиной, другие растения с baseline coverage.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {featureCards.map((feature) => (
          <Card key={feature.title} className="bg-card/90">
            <CardHeader>
              <feature.icon className={`h-9 w-9 ${feature.accent}`} />
              <CardTitle className="pt-4">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Как это работает</CardTitle>
            <CardDescription>
              Два входа сходятся в одном unified research view.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {[
              'Введите AGI ID, символ, локус или вариант в search-first workbench.',
              'Либо загрузите VCF/BAM/FASTA/BED и получите persistent run с честным статусом pipeline.',
              'Сопоставьте варианты с экспрессией, регуляцией, GO и выносите статьи в отдельный literature workspace.',
            ].map((step, index) => (
              <div
                key={step}
                className="flex items-start gap-4 rounded-2xl border border-genome-border bg-muted/40 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-slate-300">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Species capability matrix</CardTitle>
            <CardDescription>
              Arabidopsis получает максимальную глубину, остальные species стартуют с baseline support.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {SPECIES_OPTIONS.map((species) => (
              <div key={species.id} className="rounded-2xl border border-genome-border bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{species.label}</p>
                    <p className="mt-1 text-sm text-slate-500">{species.commonName}</p>
                  </div>
                  <Badge variant={species.capabilities.arabidopsisDepth ? 'success' : 'outline'}>
                    {species.capabilities.arabidopsisDepth ? 'full depth' : 'baseline'}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
