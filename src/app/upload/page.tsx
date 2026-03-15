'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [speciesId, setSpeciesId] = useState<SpeciesId>(DEFAULT_SPECIES_ID)
  const [assemblyId, setAssemblyId] = useState<AssemblyId>(
    getSpeciesDefinition(DEFAULT_SPECIES_ID).defaultAssemblyId,
  )
  const [isDragging, setIsDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const { uploadFile, isLoading, progress, error, resetProgress, clearError } =
    useAnalysisStore()

  const acceptedExtensions = useMemo(
    () => SUPPORTED_FORMATS.map((format) => format.extension) as string[],
    [],
  )
  const activeError = localError ?? error
  const species = getSpeciesDefinition(speciesId)
  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const clearSelectedFile = useCallback(() => {
    setFile(null)
    resetFileInput()
  }, [resetFileInput])

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelection = useCallback(
    (nextFile: File) => {
      const extension = nextFile.name
        .slice(nextFile.name.lastIndexOf('.'))
        .toLowerCase()

      if (!acceptedExtensions.includes(extension)) {
        setLocalError(
          `Неверный формат файла. Поддерживаются ${acceptedExtensions.join(', ')}.`,
        )
        clearSelectedFile()
        return
      }

      clearError()
      resetProgress()
      setLocalError(null)
      setFile(nextFile)
    },
    [acceptedExtensions, clearError, clearSelectedFile, resetProgress],
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
            Загрузка данных
          </Badge>
          <CardTitle className="text-3xl">
            Загрузка исследовательских файлов
          </CardTitle>
          <CardDescription>
            Выберите вид, сборку и файл. Для `VCF` приложение строит карточки
            вариантов, а затем раскрывает исследовательский контекст вокруг
            фокусного гена.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label
              htmlFor="upload-species"
              className="space-y-2 text-sm font-medium text-slate-300"
            >
              Вид
              <select
                id="upload-species"
                className="border-genome-border bg-muted/60 focus:border-primary h-11 w-full rounded-2xl border px-4 text-sm text-white transition-colors outline-none"
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

            <label
              htmlFor="upload-assembly"
              className="space-y-2 text-sm font-medium text-slate-300"
            >
              Сборка
              <select
                id="upload-assembly"
                className="border-genome-border bg-muted/60 focus:border-primary h-11 w-full rounded-2xl border px-4 text-sm text-white transition-colors outline-none"
                value={assemblyId}
                onChange={(event) =>
                  setAssemblyId(event.target.value as AssemblyId)
                }
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
            <div className="border-genome-border bg-muted/40 rounded-2xl border p-4">
              <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">
                Режим обработки
              </p>
              <p className="mt-3 text-sm font-semibold text-white">
                Исследовательский контекст растений
              </p>
              <p
                id="upload-pipeline-help"
                className="mt-2 text-sm leading-6 text-slate-400"
              >
                `VCF` проходит через аннотацию по Ensembl и эвристическую оценку
                эффекта. `BAM/FASTA/BED` создают локально сохранённый запуск с
                явным статусом ожидания более тяжёлой серверной обработки.
              </p>
            </div>

            <div className="border-genome-border bg-muted/40 rounded-2xl border p-4">
              <p className="text-xs tracking-[0.2em] text-slate-500 uppercase">
                Глубина покрытия
              </p>
              <p className="mt-3 text-sm font-semibold text-white">
                {species.capabilities.arabidopsisDepth
                  ? 'Максимальная'
                  : 'Базовая'}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {species.capabilities.arabidopsisDepth
                  ? 'Экспрессия, регуляция и литература будут доступны с максимальной детализацией.'
                  : 'Интерфейс сохранится, но часть карточек будет доступна в базовом режиме.'}
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
            aria-describedby="upload-pipeline-help upload-dropzone-help"
          >
            {!file ? (
              <div className="flex flex-col items-center text-center">
                <div className="bg-primary/10 text-primary mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem]">
                  <Upload size={34} aria-hidden="true" />
                </div>
                <h2 className="text-xl font-semibold text-white">
                  Перетащите файл с геномными данными растений в область
                  загрузки
                </h2>
                <p
                  id="upload-dropzone-help"
                  className="mt-3 max-w-xl text-sm leading-7 text-slate-400"
                >
                  Для `VCF` вы получите последствия вариантов и
                  исследовательскую рабочую область. Для `BAM/FASTA/BED`
                  приложение сохранит запуск локально и честно покажет состояние
                  очереди, пока тяжёлая серверная обработка не подключена.
                </p>
                <Button
                  type="button"
                  size="lg"
                  className="mt-8 h-12 rounded-full px-8"
                  onClick={openFilePicker}
                >
                  Выбрать файл
                </Button>
                <input
                  id="genome-file"
                  ref={fileInputRef}
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
                <div className="border-genome-border bg-genome-card/70 flex items-start gap-4 rounded-3xl border p-5">
                  <div className="bg-secondary/10 text-secondary flex h-12 w-12 items-center justify-center rounded-2xl">
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
                      onClick={clearSelectedFile}
                      className="rounded-full p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
                      aria-label="Удалить файл"
                    >
                      <X size={18} />
                    </button>
                  ) : null}
                </div>

                <div className="border-genome-border bg-muted/40 rounded-3xl border p-5">
                  <div className="mb-4 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Статус обработки</span>
                    <span
                      className="text-primary font-semibold"
                      role="status"
                      aria-live="polite"
                    >
                      {progress}%
                    </span>
                  </div>
                  <div
                    className="bg-genome-border h-2 overflow-hidden rounded-full"
                    role="progressbar"
                    aria-label="Прогресс анализа"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <div
                      className="genome-gradient h-full rounded-full transition-all duration-300"
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
            <div
              className="border-destructive/20 bg-destructive/5 text-destructive flex gap-3 rounded-2xl border p-4 text-sm"
              role="alert"
            >
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <p>{activeError}</p>
            </div>
          ) : null}

          {progress === 100 && !activeError && file ? (
            <div
              className="border-primary/20 bg-primary/5 text-primary flex gap-3 rounded-2xl border p-4 text-sm"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <p>Анализ завершён. Открываю панель исследования.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Поддерживаемые форматы</CardTitle>
            <CardDescription>
              Все форматы валидируются в UI, но только VCF сейчас завершается
              полной онлайн-аннотацией.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {SUPPORTED_FORMATS.map((format) => (
              <div
                key={format.extension}
                className="border-genome-border bg-muted/40 rounded-2xl border p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    {format.label}
                  </p>
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
            <CardTitle>Что доступно после загрузки</CardTitle>
            <CardDescription>
              Загруженный анализ не заканчивается таблицей вариантов.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-genome-border bg-muted/40 flex items-start gap-3 rounded-2xl border p-4">
              <Leaf className="text-primary mt-1 h-5 w-5 shrink-0 self-start" />
              <p className="text-sm leading-6 text-slate-400">
                Панель анализа раскрывает фокусный ген через экспрессию,
                регуляцию, GO-термины, ортологию и доказательные карточки.
              </p>
            </div>
            <div className="border-genome-border bg-muted/40 flex items-start gap-3 rounded-2xl border p-4">
              <Database className="text-secondary mt-1 h-5 w-5 shrink-0 self-start" />
              <p className="text-sm leading-6 text-slate-400">
                История запусков сохраняется после перезагрузки страницы и
                хранится в локальном рабочем каталоге `.phyto/`.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
