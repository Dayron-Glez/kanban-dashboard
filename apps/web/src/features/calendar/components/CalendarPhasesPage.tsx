import { useMemo, useState } from "react"
import { useParams } from "react-router"
import { IconTemplate } from "@tabler/icons-react"
import type { DatePoint, SetElementRuleInput, UpdateElementPlanInput } from "@repo/contracts"
import { Button, QueryErrorState, Skeleton } from "@/shared/index"
import { useProject } from "@/features/project"
import {
  useGenerateFromTemplate,
  usePlan,
  useRemoveRule,
  useSetRule,
  useUpdatePlan,
} from "../api/elements"
import { buildElementTree } from "../lib/elementTree"
import { missingSetup } from "../lib/planFormat"
import { ElementSheet } from "./ElementSheet"
import { ElementTree } from "./ElementTree"
import { PlanSetup } from "./PlanSetup"

export function CalendarPhasesPage() {
  const { id: projectId = "" } = useParams<{ id: string }>()
  const plan = usePlan(projectId)
  const generate = useGenerateFromTemplate(projectId)
  const update = useUpdatePlan(projectId)
  const setRule = useSetRule(projectId)
  const removeRule = useRemoveRule(projectId)
  const [openId, setOpenId] = useState<string | null>(null)
  const pending = update.isPending || setRule.isPending || removeRule.isPending
  const isOwner = useProject(projectId).data?.role === "owner"
  const elements = plan.data?.elements
  const tree = useMemo(() => buildElementTree(elements ?? []), [elements])
  const steps = useMemo(() => missingSetup(elements ?? []), [elements])

  const onUpdate = (elementId: string, input: UpdateElementPlanInput) =>
    update.mutate({ elementId, input })
  const onSetRule = (elementId: string, point: DatePoint, input: SetElementRuleInput) =>
    setRule.mutate({ elementId, point, input })
  const onRemoveRule = (elementId: string, point: DatePoint) =>
    removeRule.mutate({ elementId, point })

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">Fases</h1>

      {plan.isPending ? (
        <div className="flex flex-col gap-2" aria-busy>
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : plan.isError ? (
        <QueryErrorState error={plan.error} onRetry={() => void plan.refetch()} />
      ) : tree.length === 0 ? (
        <div className="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center text-sm">
          <p>Este proyecto todavía no tiene fases.</p>
          {isOwner ? (
            <Button size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
              <IconTemplate className="mr-1 h-4 w-4" />
              Generar desde la plantilla
            </Button>
          ) : (
            <p>Solo el propietario puede generarlas desde la plantilla.</p>
          )}
        </div>
      ) : (
        <>
          {isOwner && <PlanSetup steps={steps} pending={pending} onUpdate={onUpdate} />}
          <ElementTree
            nodes={tree}
            dependencies={plan.data.dependencies}
            editable={isOwner}
            pending={pending}
            onUpdate={onUpdate}
            onOpen={setOpenId}
          />
          <ElementSheet
            elementId={openId}
            plan={plan.data}
            editable={isOwner}
            pending={pending}
            onClose={() => setOpenId(null)}
            onUpdate={onUpdate}
            onSetRule={onSetRule}
            onRemoveRule={onRemoveRule}
          />
        </>
      )}
    </div>
  )
}
