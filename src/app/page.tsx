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
import {
  SAMPLE_QUERIES,
  SPECIES_OPTIONS,
  SUPPORTED_FORMATS,
} from '@/lib/constants'

const featureCards = [
  {
    title: 'Два сценария работы',
    description:
      'Одинаково поддерживаются поиск по гену, локусу или варианту и загрузка исследовательских файлов.',
    icon: ScanSearch,
    accent: 'text-sky-300',
  },
  {
    title: 'Глубина для Arabidopsis',
    description:
      'Экспрессия, регуляция, онтологии, литература и ортологи собираются в единый исследовательский обзор.',
    icon: Leaf,
    accent: 'text-lime-300',
  },
  {
    title: 'Онлайн-источники',
    description:
      'Ensembl Plants, BAR ThaleMine, Expression Atlas и Europe PMC подключены как базовый слой доказательств.',
    icon: FlaskConical,
    accent: 'text-amber-300',
  },
  {
    title: 'Контекст после загрузки',
    description:
      'VCF-аннотация и сопроводительные карточки ориентированы на геномику растений, а не на клинический сценарий.',
    icon: BookOpen,
    accent: 'text-rose-300',
  },
]

export default function Home() {
  return (
    <div className="flex flex-col gap-8 py-2">
      <section className="border-genome-border bg-card relative overflow-hidden rounded-[2rem] border px-6 py-10 md:px-10 md:py-14">
        <DNABackgroundClient />
        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">Приоритет Arabidopsis</Badge>
            <Badge variant="outline">Геномика растений</Badge>
            <Badge variant="outline">Онлайн-агрегация источников</Badge>
          </div>

          <div className="max-w-5xl">
            <h1 className="text-4xl leading-[1.08] font-black tracking-tight text-white md:text-6xl md:leading-[1.02]">
              PhytoScope собирает максимум полезной информации для исследований
              в области геномики растений.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              Интерфейс объединяет контекст вариантов, функции генов,
              экспрессию, регуляцию, ортологию и научные публикации. Первая
              версия оптимизирована под{' '}
              <span className="font-semibold text-white">
                Arabidopsis thaliana
              </span>
              , но сохраняет масштабируемую архитектуру и для других растений.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/workbench">
                Открыть поиск
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base"
            >
              <Link href="/upload">
                Загрузить файл
                <Upload className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="h-12 px-8 text-base"
            >
              <Link href="/literature">
                Найти статьи
                <LibraryBig className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle>{SAMPLE_QUERIES.length} примеров запросов</CardTitle>
                <CardDescription>
                  Можно сразу начать поиск по гену, локусу или варианту.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle>
                  {SUPPORTED_FORMATS.length} форматов загрузки
                </CardTitle>
                <CardDescription>
                  Поддерживаются VCF, FASTA, BAM и BED для разных сценариев
                  исследования.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle>{SPECIES_OPTIONS.length} пресетов видов</CardTitle>
                <CardDescription>
                  Для Arabidopsis доступна максимальная глубина, для остальных
                  видов включён базовый режим.
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
              Два сценария сходятся в одном исследовательском представлении.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {[
              'Введите AGI ID, символ, локус или вариант и сразу откройте рабочую область поиска.',
              'Либо загрузите VCF, BAM, FASTA или BED и получите запуск с прозрачным статусом обработки.',
              'Сопоставьте варианты с экспрессией, регуляцией, GO-терминами и переходите к отдельному поиску литературы.',
            ].map((step, index) => (
              <div
                key={step}
                className="border-genome-border bg-muted/40 flex items-start gap-4 rounded-2xl border p-4"
              >
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold">
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-slate-300">{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Матрица возможностей по видам
            </CardTitle>
            <CardDescription>
              Arabidopsis получает максимальную глубину, остальные виды стартуют
              с базовой поддержкой.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {SPECIES_OPTIONS.map((species) => (
              <div
                key={species.id}
                className="border-genome-border bg-muted/40 rounded-2xl border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {species.label}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {species.commonName}
                    </p>
                  </div>
                  <Badge
                    variant={
                      species.capabilities.arabidopsisDepth
                        ? 'success'
                        : 'outline'
                    }
                  >
                    {species.capabilities.arabidopsisDepth
                      ? 'Максимум'
                      : 'Базовый'}
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
