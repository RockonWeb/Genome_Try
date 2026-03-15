import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Dna,
  ShieldCheck,
  Upload,
  Workflow,
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
import { GENOME_BUILDS, SAMPLE_REPORT_ID, SUPPORTED_FORMATS } from '@/lib/constants'

const featureCards = [
  {
    title: 'Загрузка и валидация',
    description:
      'Поддержка FASTA, VCF, BAM и BED с проверкой расширения, прогрессом и выбором сборки генома.',
    icon: Upload,
    accent: 'text-primary',
  },
  {
    title: 'Интерактивный дашборд',
    description:
      'KPI-плитки, Manhattan plot, распределение по хромосомам и таблица приоритетных вариантов.',
    icon: BarChart3,
    accent: 'text-secondary',
  },
  {
    title: 'Ensembl API и Zustand',
    description:
      'VCF-аннотация уже идёт через Ensembl REST API, а клиентское состояние готово к полноценному backend.',
    icon: Workflow,
    accent: 'text-amber-400',
  },
  {
    title: 'Исследовательская безопасность',
    description:
      'Тёмный интерфейс, адаптивная навигация и подготовка отчёта для сохранения в PDF.',
    icon: ShieldCheck,
    accent: 'text-rose-400',
  },
]

const workflowSteps = [
  'Загрузите файл и выберите сборку генома.',
  'Получите аннотацию Ensembl для VCF или fallback-анализ для остальных форматов.',
  'Изучите приоритетные варианты, фильтры, экспорт CSV и печатный отчёт.',
]

export default function Home() {
  return (
    <div className="flex flex-col gap-8 py-2">
      <section className="relative overflow-hidden rounded-[2rem] border border-genome-border bg-card px-6 py-10 md:px-10 md:py-14">
        <DNABackgroundClient />
        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">Next.js 16 + React 19</Badge>
            <Badge variant="outline">Ensembl VEP connected</Badge>
          </div>

          <div className="max-w-4xl">
            <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">
              GenomeScope переводит черновой прототип в полноценный интерфейс анализа генома.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
              Проект уже включает страницы, сервисный слой, Zustand store, таблицы,
              графики и экспорт. Интерфейс ориентирован на исследовательский сценарий:
              от загрузки исходного файла до интерпретации клинически важных вариантов.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/upload">
                Запустить анализ
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
              <Link href={`/dashboard?id=${SAMPLE_REPORT_ID}`}>Открыть демо-дашборд</Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle>4 сценария</CardTitle>
                <CardDescription>Главная, загрузка, дашборд и архив отчётов</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle>12 приоритетных вариантов</CardTitle>
                <CardDescription>Реальные VCF-аннотации или fallback-набор для графиков и фильтров</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-white/5">
              <CardHeader className="pb-3">
                <CardTitle>CSV и PDF</CardTitle>
                <CardDescription>Экспорт результатов без внешнего бэкенда</CardDescription>
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
            <CardTitle className="text-2xl">Рабочий поток</CardTitle>
            <CardDescription>
              README-задачи закрыты как единая продуктовая цепочка, а не набор
              изолированных заготовок.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {workflowSteps.map((step, index) => (
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
            <CardTitle className="text-2xl">Поддерживаемые данные</CardTitle>
            <CardDescription>
              Форматы и сборки доступны в загрузчике: `VCF/hg38/hg19` идут в Ensembl, остальные сценарии работают через fallback-цепочку.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_FORMATS.map((format) => (
                <Badge key={format.extension} variant="outline">
                  {format.label}
                </Badge>
              ))}
            </div>

            <div className="space-y-3">
              {GENOME_BUILDS.map((build) => (
                <div key={build.id} className="rounded-2xl border border-genome-border bg-muted/40 p-4">
                  <div className="flex items-center gap-3">
                    <Dna className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-white">{build.name}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {build.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
