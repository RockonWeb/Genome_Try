import type { AnalysisSummary, VariantAnnotation } from '@/types/genome'

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
  variants: VariantAnnotation[],
) => {
  const header = [
    'Variant ID',
    'Gene ID',
    'Gene Symbol',
    'Chromosome',
    'Position',
    'Reference',
    'Alternate',
    'Type',
    'Predicted impact',
    'Consequences',
    'Feature type',
    'Transcript',
    'Source',
  ]

  const rows = variants.map((variant) =>
    [
      variant.id,
      variant.geneId ?? '',
      variant.geneSymbol,
      variant.chromosome,
      variant.position,
      variant.reference,
      variant.alternate,
      variant.type,
      variant.predictedImpact,
      variant.consequenceTerms.join('; '),
      variant.featureType,
      variant.transcript,
      variant.source,
    ]
      .map(escapeCsvValue)
      .join(','),
  )

  const filename = `${summary.sampleId.toLowerCase()}-plant-variants.csv`
  downloadBlob(filename, [header.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8')
}

export const printAnalysisReport = (
  summary: AnalysisSummary,
  variants: VariantAnnotation[],
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
    <title>${escapeHtml(summary.sampleId)} - PhytoScope report</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; margin: 40px; color: #142033; }
      h1, h2 { margin: 0 0 12px; }
      p { margin: 0 0 8px; color: #334155; }
      .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
      .card { border: 1px solid #d4d4d8; border-radius: 18px; padding: 16px; background: #f8fafc; }
      table { width: 100%; border-collapse: collapse; margin-top: 24px; }
      th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 13px; vertical-align: top; }
      th { background: #e0f2fe; color: #0f172a; }
      .muted { color: #64748b; font-size: 13px; }
    </style>
  </head>
  <body>
    <h1>PhytoScope Plant Research Report</h1>
    <p class="muted">Сводка по текущему plant-aware analysis run. Используйте печать браузера для сохранения в PDF.</p>

    <div class="meta">
      <div class="card">
        <h2>Образец</h2>
        <p><strong>ID:</strong> ${escapeHtml(summary.sampleId)}</p>
        <p><strong>Файл:</strong> ${escapeHtml(summary.fileName)}</p>
        <p><strong>Вид:</strong> ${escapeHtml(summary.speciesId)}</p>
        <p><strong>Assembly:</strong> ${escapeHtml(summary.assemblyId)}</p>
      </div>
      <div class="card">
        <h2>Метрики</h2>
        <p><strong>Вариантов:</strong> ${numberFormatter.format(summary.variantCount)}</p>
        <p><strong>High impact:</strong> ${numberFormatter.format(summary.highImpactVariants)}</p>
        <p><strong>Mean depth:</strong> ${summary.meanDepth}</p>
        <p><strong>Focus gene:</strong> ${escapeHtml(summary.focusGene)}</p>
      </div>
    </div>

    <h2>Приоритетные варианты</h2>
    <table>
      <thead>
        <tr>
          <th>Gene</th>
          <th>Variant</th>
          <th>Impact</th>
          <th>Consequences</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        ${topVariants
          .map(
            (variant) => `<tr>
              <td>${escapeHtml(variant.geneSymbol)}</td>
              <td>${escapeHtml(`${variant.chromosome}:${variant.position} ${variant.reference}>${variant.alternate}`)}</td>
              <td>${escapeHtml(variant.predictedImpact)}</td>
              <td>${escapeHtml(variant.consequenceTerms.join(', '))}</td>
              <td>${escapeHtml(variant.source)}</td>
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
