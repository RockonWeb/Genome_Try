# PhytoScope

[English version](README.md)

PhytoScope — веб-платформа для исследований в области геномики растений. Она объединяет поисковую работу по генам и вариантам, загрузку файлов с учётом вида и сборки, структурированную агрегацию доказательств, поиск литературы и постоянное хранение запусков в одном продукте.

Текущая версия продукта оптимизирована под `Arabidopsis thaliana`, но сохраняет мультивидовую архитектуру для более широких исследовательских сценариев по другим растениям.

## Возможности продукта

- Поисковая рабочая область для запросов по `AGI ID`, символу гена, локусу или варианту.
- Пайплайн загрузки `VCF`, `FASTA`, `BAM` и `BED` с выбором вида и сборки.
- Панель анализа, которая собирает контекст вариантов, функции генов, экспрессию, регуляцию, ортологию, взаимодействия и литературу.
- Отдельное пространство литературы с серверной фильтрацией и ранжированием по `Europe PMC`.
- Архив запусков с поиском, фильтрацией, режимом сравнения и экспортом `CSV` / `PDF`.
- Постоянное локальное хранение запусков, внутренних данных, снимков состояния источников, загруженных файлов и артефактов.
- Безопасный резервный режим для внешних источников, чтобы интерфейс оставался рабочим даже при частичной недоступности данных.

## Исследовательская модель

PhytoScope строится вокруг доказательного слоя по растениям, а не вокруг клинического или human-genome сценария. Базовая модель данных организована вокруг:

- `species`
- `assembly`
- `gene`
- `locus`
- `variant`
- `literature evidence`
- `source health`

## Источники данных

Живой слой данных использует:

- `Ensembl Plants REST`
- `BAR ThaleMine`
- `Expression Atlas`
- `Europe PMC`

`TAIR` рассматривается как опциональный коннектор. Для базовой работы продукта он не требуется.

## Технологический стек

| Слой         | Технологии                                       |
| ------------ | ------------------------------------------------ |
| Фреймворк    | Next.js 16, App Router                           |
| UI           | React 19, Tailwind CSS 4                         |
| Язык         | TypeScript (`strict`)                            |
| Состояние    | Zustand                                          |
| UI-примитивы | Headless UI, Radix Slot, CVA                     |
| Иконки       | Lucide React                                     |
| Хранилище    | SQLite + локальная файловая система в `.phyto/`  |
| Качество     | ESLint 9, TypeScript, Node test runner, Prettier |

## Быстрый старт

```bash
npm install
npm run dev
```

После запуска приложение доступно по адресу [http://localhost:3000](http://localhost:3000).

## Опциональный провайдер перевода

PhytoScope умеет автоматически переводить аннотации статей на русский в разделе литературы и в карточках workbench.

Для этого настройте один из серверных провайдеров:

```bash
# DeepL (предпочтительно)
DEEPL_API_KEY=your-key
# Необязательная замена для платного endpoint:
# DEEPL_API_URL=https://api.deepl.com

# или любой сервис, совместимый с LibreTranslate
LIBRETRANSLATE_URL=https://your-libtranslate-host
LIBRETRANSLATE_API_KEY=optional-key
```

Порядок выбора провайдера: сначала `DeepL`, затем `LibreTranslate`.

## Скрипты

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run format
```

## Маршруты

### `/`

Главная страница с обзором продукта, входами в основные режимы и краткой сводкой возможностей по видам.

### `/workbench`

Поисковая рабочая область для запросов вида:

- `AT1G01010`
- `NAC001`
- `1:3631-5899`
- `1:3631 G>A`

### `/upload`

Сценарий загрузки plant genomics файлов с учётом вида и сборки. Для `VCF` запуск аннотируется сразу, а `FASTA`, `BAM` и `BED` регистрируются как постоянно хранимые запуски со статусом очереди, сохранением исходных файлов и артефактов.

### `/dashboard`

Единый исследовательский обзор для выбранного анализа, включая завершённые результаты и прозрачные состояния для незавершённых запусков.

### `/literature`

Отдельная рабочая область для поиска литературы с параметрами `q`, `species`, `yearFrom`, `sort` и `source`.

### `/reports`

Архив запусков с фильтрацией, режимом сравнения двух завершённых анализов и действиями экспорта.

## API

В приложение встроен прикладной API-слой:

- `POST /api/analysis/upload`
- `GET /api/analyses`
- `GET /api/analyses/:id`
- `GET /api/search/resolve`
- `GET /api/gene/:id`
- `GET /api/locus/:region`
- `POST /api/variant/annotate`
- `GET /api/literature`
- `GET /api/source-status`

## Локальное хранилище

PhytoScope хранит рабочие данные локально в `.phyto/`:

- `.phyto/phyto.db` — SQLite-база для analyses, payloads, source cache и source health checks.
- `.phyto/uploads/<analysisId>/` — оригинальные загруженные файлы.
- `.phyto/artifacts/<analysisId>/` — JSON-артефакты со сводкой, вариантами и состоянием рабочей области.

## Структура проекта

```text
src/
├── app/
│   ├── api/
│   ├── dashboard/
│   ├── literature/
│   ├── reports/
│   ├── upload/
│   ├── workbench/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── layout/
│   ├── research/
│   └── ui/
├── hooks/
│   └── useAnalysisStore.ts
├── lib/
│   ├── constants.ts
│   ├── ensembl.ts
│   ├── exporters.ts
│   ├── literature.ts
│   ├── mockData.ts
│   ├── query.ts
│   ├── researchAggregator.ts
│   └── utils.ts
├── services/
│   ├── analysisService.ts
│   ├── genomeApi.ts
│   └── researchApi.ts
└── types/
    └── genome.ts
```

## Покрытие тестами

Автоматические тесты покрывают:

- нормализацию gene, locus и variant запросов
- парсинг VCF и контракт аннотации вариантов для растений
- постоянное хранение, сериализацию и TTL-кеширование внешних данных
- маршруты upload, analyses, literature и source-status
- фильтрацию отчётов и логику сравнения запусков
- корректное поведение пустых и degraded-состояний для агрегации workbench

## Верификация

Проект регулярно проверяется командами:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
