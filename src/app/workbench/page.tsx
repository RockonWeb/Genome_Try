import { WorkbenchResults } from '@/components/research/WorkbenchResults'
import { WorkbenchSearchForm } from '@/components/research/WorkbenchSearchForm'
import { Badge } from '@/components/ui/Badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { DEFAULT_SPECIES_ID } from '@/lib/constants'
import { buildWorkbenchFromQuery } from '@/lib/researchAggregator'
import type { SpeciesId } from '@/types/genome'

export default async function WorkbenchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; species?: string }>
}) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const speciesId =
    (params.species as SpeciesId | undefined) ?? DEFAULT_SPECIES_ID
  const workbench = query
    ? await buildWorkbenchFromQuery(query, speciesId)
    : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Рабочая область поиска
          </Badge>
          <CardTitle className="text-3xl">
            Поиск по гену, локусу или варианту
          </CardTitle>
          <CardDescription>
            Поддерживаются AGI-идентификаторы, символы генов, геномные локусы и
            простая запись вариантов.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkbenchSearchForm
            initialQuery={query}
            initialSpeciesId={speciesId}
          />
        </CardContent>
      </Card>

      {workbench ? <WorkbenchResults workbench={workbench} /> : null}
    </div>
  )
}
