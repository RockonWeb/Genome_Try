import type { AnalysisSummary, GenomeVariant } from '@/types/genome'

const numberFormatter = new Intl.NumberFormat('ru-RU')

const escapeCsvValue = (value: string | number) =>
  `"${String(value).replaceAll('"', '""')}"`

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const downloadBlob = (filename: string, content: string, mimeType: string) => {
  if (typeof window === 'undefined') {
    return
  }

  const blob = new Blob([content], { type: mimeType })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

export const downloadVariantsCsv = (
  summary: AnalysisSummary,
  variants: GenomeVariant[],
) => {
  const header = [
    'Variant ID',
    'Gene',
    'Chromosome',
    'Position',
    'Reference',
    'Alternate',
    'Type',
    'Impact',
    'Clinical significance',
    'Quality',
    'Depth',
    'p-value',
    'Transcript',
  ]

  const rows = variants.map((variant) =>
    [
      variant.id,
      variant.gene,
      variant.chromosome,
      variant.position,
      variant.reference,
      variant.alternate,
      variant.type,
      variant.impact,
      variant.clinicalSignificance,
      variant.quality,
      variant.depth,
      variant.pValue,
      variant.transcript,
    ]
      .map(escapeCsvValue)
      .join(','),
  )

  const filename = `${summary.sampleId.toLowerCase()}-variants.csv`
  downloadBlob(filename, [header.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8')
}

export const printAnalysisReport = (
  summary: AnalysisSummary,
  variants: GenomeVariant[],
) => {
  if (typeof window === 'undefined') {
    return
  }

  const reportWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900')

  if (!reportWindow) {
    return
  }

  const topVariants = variants.slice(0, 8)
  const content = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(summary.sampleId)} - GenomeScope report</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; margin: 40px; color: #0f172a; }
      h1, h2 { margin: 0 0 12px; }
      p { margin: 0 0 8px; color: #334155; }
      .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
      .card { border: 1px solid #cbd5e1; border-radius: 16px; padding: 16px; background: #f8fafc; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; }
      th { background: #eff6ff; color: #1e3a8a; }
      .muted { color: #64748b; font-size: 13px; }
    </style>
  </head>
  <body>
    <h1>GenomeScope Analysis Report</h1>
    <p class="muted">Подготовлено из mock-сервиса приложения. Используйте печать браузера для сохранения в PDF.</p>

    <div class="meta">
      <div class="card">
        <h2>Образец</h2>
        <p><strong>ID:</strong> ${escapeHtml(summary.sampleId)}</p>
        <p><strong>Файл:</strong> ${escapeHtml(summary.fileName)}</p>
        <p><strong>Сборка:</strong> ${escapeHtml(summary.genomeBuild)}</p>
        <p><strong>Формат:</strong> ${escapeHtml(summary.format)}</p>
      </div>
      <div class="card">
        <h2>Метрики</h2>
        <p><strong>Вариантов:</strong> ${numberFormatter.format(summary.variantCount)}</p>
        <p><strong>High impact:</strong> ${numberFormatter.format(summary.highImpactVariants)}</p>
        <p><strong>Pathogenic:</strong> ${numberFormatter.format(summary.pathogenicVariants)}</p>
        <p><strong>Coverage:</strong> ${summary.coverage}x</p>
      </div>
    </div>

    <h2>Приоритетные варианты</h2>
    <table>
      <thead>
        <tr>
          <th>Gene</th>
          <th>Variant</th>
          <th>Impact</th>
          <th>Clinical significance</th>
          <th>Depth</th>
        </tr>
      </thead>
      <tbody>
        ${topVariants
          .map(
            (variant) => `<tr>
              <td>${escapeHtml(variant.gene)}</td>
              <td>${escapeHtml(`${variant.chromosome}:${variant.position} ${variant.reference}>${variant.alternate}`)}</td>
              <td>${escapeHtml(variant.impact)}</td>
              <td>${escapeHtml(variant.clinicalSignificance)}</td>
              <td>${variant.depth}</td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </body>
</html>`

  reportWindow.document.write(content)
  reportWindow.document.close()
  reportWindow.focus()
  reportWindow.print()
}
