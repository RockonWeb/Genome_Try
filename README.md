# GenomeScope

GenomeScope — демонстрационное веб-приложение для загрузки, обработки и визуализации геномных данных. Проект собран на `Next.js 16` и закрывает полный пользовательский сценарий: от загрузки `FASTA/VCF/BAM/BED` до просмотра аналитического дашборда и истории отчётов. Для `VCF` на `hg38/hg19` приложение уже использует реальную внешнюю аннотацию через `Ensembl REST API (VEP)`.

## Что реализовано

- Главная страница с hero-блоком, описанием сценария и CTA.
- Страница загрузки с `drag & drop`, проверкой расширения, выбором сборки генома и индикатором прогресса.
- Аналитический дашборд с KPI, Manhattan plot, распределением по хромосомам, donut-диаграммой типов мутаций, фильтрами и модальным окном деталей варианта.
- История отчётов с completed/processing runs, экспортом `CSV`, печатным `PDF` и переходом в конкретный дашборд.
- Гибридный API-слой: реальная `VCF`-аннотация через `Ensembl REST API` и fallback mock-режим для сценариев, требующих полноценного лабораторного backend.

## Стек

| Слой | Технологии |
|---|---|
| Фреймворк | Next.js 16, App Router |
| UI | React 19, Tailwind CSS 4 |
| Язык | TypeScript (`strict`) |
| Анимации | Framer Motion |
| Состояние | Zustand |
| UI-примитивы | Headless UI, Radix Slot, CVA |
| Иконки | Lucide React |
| Графики | Кастомные SVG/CSS charts |
| Внешние данные | Ensembl REST API (VEP) для VCF-аннотации |
| Качество | ESLint 9, Prettier |

## Быстрый старт

```bash
npm install
npm run dev
```

После запуска приложение будет доступно на [http://localhost:3000](http://localhost:3000).

## Скрипты

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run format
```

## Страницы

### `/`
Маркетинговая и навигационная точка входа в приложение. Показывает возможности интерфейса, поддерживаемые форматы и сценарий работы.

### `/upload`
Позволяет загрузить genomic-файл, выбрать `hg38 / hg19 / T2T-CHM13`, пройти mock-обработку и перейти к результатам анализа.

### `/dashboard`
Показывает summary конкретного анализа: метрики, Manhattan plot, распределение по хромосомам, типы мутаций, фильтрацию и детальный просмотр варианта.

### `/reports`
Хранит историю completed и processing запусков, позволяет открыть нужный дашборд и выгрузить отчёт в `CSV/PDF`.

## Структура проекта

```text
src/
├── app/
│   ├── dashboard/
│   ├── reports/
│   ├── upload/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   └── ui/
├── hooks/
│   └── useAnalysisStore.ts
├── lib/
│   ├── constants.ts
│   ├── exporters.ts
│   ├── mockData.ts
│   └── utils.ts
├── services/
│   ├── analysisService.ts
│   └── genomeApi.ts
└── types/
    └── genome.ts
```

## Выполнение задач из исходного README

### 1. Scaffold и конфигурация

- Настроены `Next.js`, `Tailwind CSS 4`, `ESLint`, `Prettier`, `TypeScript strict`.
- Добавлены реальные зависимости UI-слоя, анимаций и Zustand store.
- Исправлены битые lockfile-записи, мешавшие нормальной установке и линту.

### 2. UI-компоненты и layout

- Собраны переиспользуемые `Button`, `Card`, `Badge`, `Modal`, `Table`, `Spinner`, `Tooltip`.
- Реализованы `Header`, `Sidebar`, `Footer`.
- Добавлена адаптивная навигация для мобильных и планшетных экранов.

### 3. Основные страницы

- Главная, загрузка, дашборд и отчёты приведены к рабочему состоянию.
- Все сценарии работают на реалистичных mock-данных.
- Добавлены фильтры, детали варианта, история запусков и экспорт.

### 4. API-слой и финальная полировка

- `genomeApi` и `analysisService` подключены к страницам.
- `Zustand` хранит текущий анализ, историю отчётов и варианты по run id.
- Проверены сборка и линт: `npm run lint`, `npm run build`.

## API-режим

Проект работает в двух режимах:

- `VCF + hg38/hg19`: файл уходит во внутренний route `src/app/api/analysis/upload/route.ts`, где приложение парсит первые пригодные variant-записи и отправляет их в `Ensembl REST API /vep/homo_sapiens/region`.
- `FASTA/BAM/BED` и `T2T-CHM13`: используется fallback на `src/lib/mockData.ts`, потому что для этих форматов нужен реальный alignment/calling pipeline, а не один внешний REST endpoint.
- `src/lib/exporters.ts` формирует `CSV` и печатный отчёт для сохранения в PDF.

## Дальше

Следующий логичный шаг — подключить полноценный backend для загрузки `BAM/FASTA/BED`, очередей обработки, долговременного хранения uploaded runs и повторного открытия результатов после перезагрузки страницы.
