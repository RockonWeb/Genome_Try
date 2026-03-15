# PhytoScope

[Русская версия](README.ru.md)

PhytoScope is a web platform for plant genomics research. It combines search-driven exploration, species-aware file ingestion, structured evidence aggregation, literature discovery, and persistent run management in a single product.

The current product is optimized for `Arabidopsis thaliana`, while keeping a multi-species architecture for broader plant research workflows.

## Product Capabilities

- Search workspace for `AGI ID`, gene symbol, locus, or variant queries.
- Upload pipeline for `VCF`, `FASTA`, `BAM`, and `BED` files with species and assembly selection.
- Analysis dashboard that consolidates variant context, gene function, expression, regulation, orthology, interactions, and literature.
- Literature workspace with server-side filtering and ranking over `Europe PMC`.
- Run archive with search, filtering, comparison mode, and `CSV` / `PDF` export.
- Persistent local storage for runs, payloads, source health snapshots, uploaded files, and generated artifacts.
- Graceful degradation for external sources so the interface remains usable under partial source failure.

## Research Model

PhytoScope is built around plant-specific evidence rather than a clinical or human-genome workflow. The core data model is organized around:

- `species`
- `assembly`
- `gene`
- `locus`
- `variant`
- `literature evidence`
- `source health`

## Data Sources

The live evidence layer uses:

- `Ensembl Plants REST`
- `BAR ThaleMine`
- `Expression Atlas`
- `Europe PMC`

`TAIR` is treated as an optional connector. The product does not depend on it for baseline operation.

## Technology Stack

| Layer         | Technologies                                     |
| ------------- | ------------------------------------------------ |
| Framework     | Next.js 16, App Router                           |
| UI            | React 19, Tailwind CSS 4                         |
| Language      | TypeScript (`strict`)                            |
| State         | Zustand                                          |
| UI primitives | Headless UI, Radix Slot, CVA                     |
| Icons         | Lucide React                                     |
| Storage       | SQLite + local filesystem in `.phyto/`           |
| Quality       | ESLint 9, TypeScript, Node test runner, Prettier |

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Optional Translation Provider

PhytoScope can automatically translate literature abstracts into Russian in the literature workspace and workbench cards.

Configure one of the following server-side providers:

```bash
# DeepL (preferred)
DEEPL_API_KEY=your-key
# Optional override for paid plans:
# DEEPL_API_URL=https://api.deepl.com

# or any LibreTranslate-compatible service
LIBRETRANSLATE_URL=https://your-libtranslate-host
LIBRETRANSLATE_API_KEY=optional-key
```

Provider selection order is `DeepL` first, then `LibreTranslate`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run format
```

## Routes

### `/`

Landing page with product overview, entry points, and species capability summary.

### `/workbench`

Search-first workspace for:

- `AT1G01010`
- `NAC001`
- `1:3631-5899`
- `1:3631 G>A`

### `/upload`

Species-aware ingestion flow for plant genomics files. `VCF` runs are annotated immediately; `FASTA`, `BAM`, and `BED` runs are registered as persistent queued analyses with stored source files and artifacts.

### `/dashboard`

Unified research view for a selected analysis, including completed results and transparent non-completed run states.

### `/literature`

Dedicated literature discovery workspace with `q`, `species`, `yearFrom`, `sort`, and `source` parameters.

### `/reports`

Run archive with filtering, comparison mode for two completed analyses, and export actions.

## API

The application ships with an integrated API layer:

- `POST /api/analysis/upload`
- `GET /api/analyses`
- `GET /api/analyses/:id`
- `GET /api/search/resolve`
- `GET /api/gene/:id`
- `GET /api/locus/:region`
- `POST /api/variant/annotate`
- `GET /api/literature`
- `GET /api/source-status`

## Storage Layout

PhytoScope stores working data locally in `.phyto/`:

- `.phyto/phyto.db` — SQLite database for analyses, payloads, source cache, and source health checks.
- `.phyto/uploads/<analysisId>/` — original uploaded files.
- `.phyto/artifacts/<analysisId>/` — generated JSON artifacts for summary, variants, and workbench state.

## Project Structure

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

## Test Coverage

Automated tests cover:

- query normalization for gene, locus, and variant inputs
- plant-oriented VCF parsing and variant annotation contracts
- persistence, serialization, and TTL-cached source data
- upload, analyses, literature, and source-status routes
- report filtering and run comparison logic
- degraded empty-state behavior for workbench aggregation

## Verification

The project is routinely validated with:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
