import { useState } from "react"
import { IconChevronRight } from "@tabler/icons-react"
import { ELEMENT_KIND_LABELS, type ElementNode } from "../lib/elementTree"

interface ElementTreeProps {
  nodes: ElementNode[]
}

// Los hijos toman el color de su fase, más claro cuanto más hondo.
const shade = (color: string | null, depth: number) =>
  color
    ? `color-mix(in oklch, ${color} ${Math.max(100 - depth * 25, 30)}%, transparent)`
    : undefined

export function ElementTree({ nodes }: Readonly<ElementTreeProps>) {
  // Las fases empiezan abiertas y el resto cerrado: se guarda lo que el usuario cambia.
  const [toggled, setToggled] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setToggled((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const renderNode = (node: ElementNode) => {
    const { element, depth, children } = node
    const expanded = toggled.has(element.id) !== (depth === 0)
    const hasChildren = children.length > 0

    return (
      <li key={element.id} role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
        <div
          className="hover:bg-muted/60 flex items-center gap-2 rounded-md py-1.5 pr-2"
          style={{ paddingLeft: `${depth * 20 + 4}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(element.id)}
              aria-label={`${expanded ? "Plegar" : "Desplegar"} ${element.name}`}
              className="text-muted-foreground hover:text-foreground flex size-5 items-center justify-center rounded"
            >
              <IconChevronRight
                size={14}
                className={`transition-transform ${expanded ? "rotate-90" : ""}`}
              />
            </button>
          ) : (
            <span className="size-5" />
          )}
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: shade(node.phaseColor, depth) }}
          />
          <span className={depth === 0 ? "text-sm font-semibold" : "text-sm"}>{element.name}</span>
          <span className="text-muted-foreground ml-auto text-xs">
            {ELEMENT_KIND_LABELS[element.kind]}
          </span>
        </div>
        {hasChildren && expanded && <ul role="group">{children.map(renderNode)}</ul>}
      </li>
    )
  }

  return (
    <ul role="tree" aria-label="Fases del proyecto">
      {nodes.map(renderNode)}
    </ul>
  )
}
