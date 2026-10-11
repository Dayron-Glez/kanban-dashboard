import { useState } from "react"
import { IconChevronRight } from "@tabler/icons-react"
import type { CalendarElement, ElementDependency, UpdateElementPlanInput } from "@repo/contracts"
import { ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"
import { describeIssue, describeRule, formatPlanDate } from "../lib/planFormat"
import { DateEditor, DurationEditor } from "./PlanEditors"

interface ElementTreeProps {
  nodes: ElementNode[]
  dependencies: ElementDependency[]
  editable: boolean
  pending: boolean
  onUpdate: (elementId: string, input: UpdateElementPlanInput) => void
}

// Los hijos toman el color de su fase, más claro cuanto más hondo.
const shade = (color: string | null, depth: number) =>
  color
    ? `color-mix(in oklch, ${color} ${Math.max(100 - depth * 25, 30)}%, transparent)`
    : undefined

const COLUMNS = "grid grid-cols-[minmax(0,1fr)_7rem_7rem_7rem] items-center gap-2"

export function ElementTree({
  nodes,
  dependencies,
  editable,
  pending,
  onUpdate,
}: Readonly<ElementTreeProps>) {
  // Las fases empiezan abiertas y el resto cerrado: se guarda lo que el usuario cambia.
  const [toggled, setToggled] = useState<Set<string>>(new Set())

  const names = new Map<string, string>()
  const collect = (list: ElementNode[]) =>
    list.forEach((node) => {
      names.set(node.element.id, node.element.name)
      collect(node.children)
    })
  collect(nodes)
  const nameOf = (id: string) => names.get(id) ?? "otro elemento"

  const toggle = (id: string) =>
    setToggled((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Un guion discreto: el motivo, al pasar el cursor y para los lectores de pantalla.
  const missing = (element: CalendarElement) => {
    const reason = element.issue && describeIssue(element.issue, nameOf)
    return (
      <span className="text-muted-foreground px-1.5" title={reason ?? undefined}>
        <span aria-hidden>—</span>
        {reason && <span className="sr-only">{reason}</span>}
      </span>
    )
  }

  const renderNode = (node: ElementNode) => {
    const { element, depth, children } = node
    const expanded = toggled.has(element.id) !== (depth === 0)
    const hasChildren = children.length > 0
    const rule = describeRule(element, dependencies, nameOf)
    const writesStart = element.isAnchor || element.isPinned

    return (
      <li key={element.id} role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
        <div className={`${COLUMNS} hover:bg-muted/60 rounded-md py-1 pr-2 text-sm`}>
          <div
            className="flex min-w-0 items-center gap-2"
            style={{ paddingLeft: `${depth * 20 + 4}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggle(element.id)}
                aria-label={`${expanded ? "Plegar" : "Desplegar"} ${element.name}`}
                className="text-muted-foreground hover:text-foreground flex size-5 shrink-0 items-center justify-center rounded"
              >
                <IconChevronRight
                  size={14}
                  className={`transition-transform ${expanded ? "rotate-90" : ""}`}
                />
              </button>
            ) : (
              <span className="size-5 shrink-0" />
            )}
            <span
              aria-hidden
              title={ELEMENT_KIND_LABELS[element.kind]}
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: shade(node.phaseColor, depth) }}
            />
            <span className={`truncate ${depth === 0 ? "font-semibold" : ""}`}>{element.name}</span>
            {rule && <span className="text-muted-foreground truncate text-xs">{rule}</span>}
          </div>

          <DurationEditor
            label={`Duración de ${element.name}`}
            value={element.duration}
            editable={editable}
            pending={pending}
            onSave={(duration) => onUpdate(element.id, { duration })}
          />
          {writesStart ? (
            <DateEditor
              label={`Inicio de ${element.name}`}
              value={element.startsOn}
              editable={editable}
              pending={pending}
              onSave={(fixedStart) => onUpdate(element.id, { fixedStart })}
            />
          ) : element.startsOn ? (
            <span className="px-1.5">{formatPlanDate(element.startsOn)}</span>
          ) : (
            missing(element)
          )}
          {element.endsOn ? (
            <span className="px-1.5">{formatPlanDate(element.endsOn)}</span>
          ) : element.startsOn ? (
            missing(element)
          ) : (
            <span className="text-muted-foreground px-1.5">—</span>
          )}
        </div>
        {hasChildren && expanded && <ul role="group">{children.map(renderNode)}</ul>}
      </li>
    )
  }

  return (
    <div>
      <div
        className={`${COLUMNS} text-muted-foreground border-border border-b pr-2 pb-2 text-xs font-medium`}
        aria-hidden
      >
        <span className="pl-8">Elemento</span>
        <span className="px-1.5">Duración</span>
        <span className="px-1.5">Inicio</span>
        <span className="px-1.5">Fin</span>
      </div>
      <ul role="tree" aria-label="Fases del proyecto" className="pt-1">
        {nodes.map(renderNode)}
      </ul>
    </div>
  )
}
