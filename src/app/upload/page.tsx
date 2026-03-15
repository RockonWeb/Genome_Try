'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle2,
  Database,
  File,
  Leaf,
  Upload,
  X,
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
import { useAnalysisStore } from '@/hooks/useAnalysisStore'
import {
  DEFAULT_SPECIES_ID,
  getSpeciesDefinition,
  SPECIES_OPTIONS,
  SUPPORTED_FORMATS,
} from '@/lib/constants'
import type { AssemblyId, SpeciesId } from '@/types/genome'

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [speciesId, setSpeciesId] = useState<SpeciesId>(DEFAULT_SPECIES_ID)
  const [assemblyId, setAssemblyId] = useState<AssemblyId>(
    getSpeciesDefinition(DEFAULT_SPECIES_ID).defaultAssemblyId,
  )
  const [isDragging, setIsDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const {
    uploadFile,
    isLoading,
    progress,
    error,
    resetProgress,
    clearError,
  } = useAnalysisStore()

  const acceptedExtensions = useMemo(
    () => SUPPORTED_FORMATS.map((format) => format.extension) as string[],
    [],
  )
  const activeError = localError ?? error
  const species = getSpeciesDefinition(speciesId)

  const handleFileSelection = useCallback(
    (nextFile: File) => {
      const extension = nextFile.name
        .slice(nextFile.name.lastIndexOf('.'))
        .toLowerCase()

      if (!acceptedExtensions.includes(extension)) {
        setLocalError(
          `Неверный формат файла. Поддерживаются ${acceptedExtensions.join(', ')}.`,
        )
        setFile(null)
        return
      }

      clearError()
      resetProgress()
      setLocalError(null)
      setFile(nextFile)
    },
    [acceptedExtensions, clearError, resetProgress],
  )

  const handleUpload = async () => {
    if (!file) {
      return
    }

    try {
      const summary = await uploadFile(file, speciesId, assemblyId)
      router.push(`/dashboard?id=${summary.id}`)
    } catch {
      // Store already contains user-facing error.
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="overflow-hidden">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Upload workspace
          </Badge>
          <CardTitle className="text-3xl">Plant-aware upload pipeline</CardTitle>
          <CardDescription>
            Выберите species, assembly и файл. Для `VCF` приложение строит plant-specific
            variant cards, а затем разворачивает research context вокруг focus gene.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-300">
              Species
              <select
                className="w-full rounded-2xl border border-genome-border bg-muted/60 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary"
                value={speciesId}
                onChange={(event) => {
                  const nextSpecies = event.target.value as SpeciesId
                  const nextDefinition = getSpeciesDefinition(nextSpecies)
                  setSpeciesId(nextSpecies)
                  setAssemblyId(nextDefinition.defaultAssemblyId)
                }}
              >
                {SPECIES_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-300">
              Assembly
              <select
                className="w-full rounded-2xl border border-genome-border bg-muted/60 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-primary"
                value={assemblyId}
                onChange={(event) => setAssemblyId(event.target.value as AssemblyId)}
              >
                {species.assemblies.map((assembly) => (
                  <option key={assembly.id} value={assembly.id}>
                    {assembly.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_240px]">
            <div className="rounded-2xl border border-genome-border bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Pipeline mode
              </p>
              <p className="mt-3 text-sm font-semibold text-white">Plant research workbench</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                `VCF` проходит через Ensembl overlap-driven annotation и heuristic impact
                inference. `BAM/FASTA/BED` создают persistent queued run с сохранением файла
                и явным статусом ожидания backend pipeline.
              </p>
            </div>

            <div className="rounded-2xl border border-genome-border bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Arabidopsis depth
              </p>
              <p className="mt-3 text-sm font-semibold text-white">
                {species.capabilities.arabidopsisDepth ? 'Maximum' : 'Baseline'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {species.capabilities.arabidopsisDepth
                  ? 'Expression, regulation и literature view будут максимально насыщены.'
                  : 'Интерфейс сохранится, но часть карточек будет baseline-level.'}
              </p>
            </div>
          </div>

          <div
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              if (event.dataTransfer.files[0]) {
                handleFileSelection(event.dataTransfer.files[0])
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`rounded-[2rem] border-2 border-dashed p-8 transition-all md:p-12 ${
              isDragging
                ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(45,212,191,0.15)]'
                : 'border-genome-border bg-muted/40'
            }`}
          >
            {!file ? (
              <div className="flex flex-col items-center text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary/10 text-primary">
                  <Upload size={34} />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Перетащите plant genomics файл в область загрузки
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">
                  Для `VCF` вы получите plant-specific consequence terms и live workbench. Для
                  `BAM/FASTA/BED` приложение сохранит run локально и честно покажет queued state,
                  пока тяжёлый backend не подключён.
                </p>
                <Button
                  size="lg"
                  className="mt-8 h-12 rounded-full px-8"
                  onClick={() => document.getElementById('genome-file')?.click()}
                >
                  Выбрать файл
                </Button>
                <input
                  id="genome-file"
                  type="file"
                  accept={acceptedExtensions.join(',')}
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files?.[0]) {
                      handleFileSelection(event.target.files[0])
                    }
                  }}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-4 rounded-3xl border border-genome-border bg-genome-card/70 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                    <File size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-white">
                      {file.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  {!isLoading ? (
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="rounded-full p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
                      aria-label="Удалить файл"
                    >
                      <X size={18} />
                    </button>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-genome-border bg-muted/40 p-5">
                  <div className="mb-4 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Статус обработки</span>
                    <span className="font-semibold text-primary">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-genome-border">
                    <div
                      className="h-full rounded-full genome-gradient transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <Button
                  size="lg"
                  className="h-12 w-full rounded-2xl text-base font-semibold"
                  onClick={handleUpload}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-5 w-5" />
                      Анализ выполняется
                    </>
                  ) : (
                    'Запустить анализ'
                  )}
                </Button>
              </div>
            )}
          </div>

          {activeError ? (
            <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{activeError}</p>
            </div>
          ) : null}

          {progress === 100 && !activeError && file ? (
            <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Анализ завершён. Открываю plant research dashboard.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Поддерживаемые форматы</CardTitle>
            <CardDescription>
              Все форматы валидируются в UI, но только VCF сейчас завершается live-аннотацией.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {SUPPORTED_FORMATS.map((format) => (
              <div
                key={format.extension}
                className="rounded-2xl border border-genome-border bg-muted/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{format.label}</p>
                  <Badge variant="outline">{format.extension}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {format.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Research context after upload</CardTitle>
            <CardDescription>
              Загруженный анализ не заканчивается на variant table.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-genome-border bg-muted/40 p-4">
              <Leaf className="mt-0.5 h-5 w-5 text-primary" />
              <p className="text-sm leading-6 text-slate-400">
                Dashboard разворачивает focus gene в expression, regulation, GO, orthology
                и evidence cards.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-genome-border bg-muted/40 p-4">
              <Database className="mt-0.5 h-5 w-5 text-secondary" />
              <p className="text-sm leading-6 text-slate-400">
                История запусков теперь переживает reload и хранится в локальном workspace `.phyto/`.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
