import type { DatePoint, DurationUnit, ElementKind, ProjectKind } from "@repo/contracts"

interface TemplateNode {
  slug: string
  kind: ElementKind
  name: string
  names?: Partial<Record<ProjectKind, string>>
  only?: ProjectKind[]
  color?: string
  anchor?: boolean
  pinned?: boolean
  children?: TemplateNode[]
}

const leaves = (kind: ElementKind, items: [slug: string, name: string][]): TemplateNode[] =>
  items.map(([slug, name]) => ({ slug, kind, name }))

const tasks = (...items: [slug: string, name: string][]) => leaves("task", items)

/** El punto de partida del calendario de un proyecto. Ver docs/modelo/README.md. */
export const CALENDAR_TEMPLATE: readonly TemplateNode[] = [
  {
    slug: "desarrollo",
    kind: "phase",
    name: "Desarrollo",
    color: "#DAD381",
    pinned: true,
    children: [
      {
        slug: "creativa",
        kind: "subphase",
        name: "Creativa",
        children: [
          { slug: "sinopsis", kind: "process", name: "Escritura de sinopsis" },
          { slug: "argumento", kind: "process", name: "Argumento", only: ["film", "documentary"] },
          { slug: "biblia", kind: "process", name: "Biblia", only: ["series"] },
          {
            slug: "mapa-de-trama",
            kind: "process",
            name: "Mapa de trama de personajes",
            only: ["series"],
          },
          {
            slug: "guion",
            kind: "process",
            name: "Escritura de guion",
            names: { series: "Escritura de guiones" },
          },
        ],
      },
      {
        slug: "financiacion",
        kind: "subphase",
        name: "Financiación",
        children: leaves("process", [
          ["desglose", "Elaboración de desglose de necesidades"],
          ["calendario", "Calendario de trabajo"],
          ["plan-de-rodaje", "Plan de rodaje"],
          ["presupuesto", "Presupuesto de financiación"],
          ["plan-de-financiacion", "Plan de financiación"],
          ["negociacion", "Negociación de la financiación"],
          ["incentivos-fiscales", "Estructuración y negociación de incentivos fiscales"],
          ["dossier", "Dossier del proyecto y búsqueda de financiación"],
        ]),
      },
      { slug: "luz-verde", kind: "event", name: "Luz verde al proyecto (financiación completa)" },
    ],
  },
  {
    slug: "softpre",
    kind: "phase",
    name: "SoftPre",
    color: "#A4DA81",
    children: [
      {
        slug: "casting",
        kind: "process",
        name: "Casting",
        children: tasks(
          ["busqueda", "Búsqueda de actores"],
          ["negociacion", "Negociación de actores"]
        ),
      },
      {
        slug: "localizaciones",
        kind: "process",
        name: "Localizaciones (Scouting)",
        children: tasks(
          ["busqueda", "Búsqueda de localizaciones"],
          ["artisticas", "Localizaciones artísticas"]
        ),
      },
      {
        slug: "evaluacion-economica",
        kind: "process",
        name: "Evaluación económica",
        children: tasks(
          ["calendario", "Elaboración de calendario"],
          ["presupuesto", "Presupuesto de ejecución"],
          ["cash-flow", "Cash flow"],
          ["protocolos", "Protocolos y Work flow"],
          ["negociacion", "Negociación"]
        ),
      },
    ],
  },
  {
    slug: "preparacion",
    kind: "phase",
    name: "Preparación",
    color: "#81DA9B",
    children: leaves("process", [
      ["recce", "Localizaciones técnicas (Recce)"],
      ["ensayos", "Ensayos"],
      ["pruebas-de-camara", "Pruebas de cámara"],
      ["pruebas-de-vestuario", "Pruebas de vestuario y maquillaje"],
      ["chequeo-de-camara", "Chequeo de cámara"],
    ]),
  },
  {
    slug: "rodaje",
    kind: "phase",
    name: "Rodaje",
    color: "#81DAD9",
    anchor: true,
    children: leaves("process", [
      ["shooting", "Shooting"],
      ["wrap", "Wrap"],
    ]),
  },
  {
    slug: "postproduccion",
    kind: "phase",
    name: "Postproducción",
    color: "#819DDA",
    children: [
      { slug: "edicion", kind: "subphase", name: "Edición" },
      {
        slug: "vfx",
        kind: "subphase",
        name: "VFX",
        children: leaves("process", [
          ["creacion", "Creación VFX"],
          ["integracion", "Integración y Composición"],
          ["render", "Render"],
        ]),
      },
      { slug: "conformado", kind: "process", name: "Conformado" },
      { slug: "etalonado", kind: "process", name: "Etalonado" },
      {
        slug: "musica",
        kind: "subphase",
        name: "Música",
        children: leaves("process", [
          ["composicion", "Composición de música"],
          ["grabacion", "Grabación de música"],
          ["mezcla", "Mezcla de música"],
        ]),
      },
      {
        slug: "montaje-de-sonido",
        kind: "subphase",
        name: "Montaje de Sonido",
        children: leaves("process", [
          ["dialogos", "Edición de diálogos"],
          ["foley", "Foley"],
          ["efectos", "Edición de efectos"],
          ["musica", "Edición de música"],
        ]),
      },
      { slug: "mezcla", kind: "process", name: "Mezcla" },
      { slug: "copia-master", kind: "process", name: "Copia Master" },
      { slug: "deliveries", kind: "subphase", name: "Deliveries" },
    ],
  },
  {
    slug: "explotacion",
    kind: "phase",
    name: "Explotación",
    color: "#A281DA",
    children: leaves("process", [
      ["publicidad", "Publicidad y Marketing"],
      ["festivales", "Festivales"],
      ["estreno", "Estreno (explotación comercial)"],
    ]),
  },
  {
    slug: "acreditacion-de-coste",
    kind: "phase",
    name: "Acreditación de coste",
    color: "#DA81D5",
  },
]

export interface TemplateElement {
  key: string
  parentKey: string | null
  kind: ElementKind
  name: string
  position: number
  color: string | null
  isAnchor: boolean
  isPinned: boolean
}

/** Los elementos con los que nace el calendario, cada padre antes que sus hijos. */
export function buildCalendarTemplate(projectKind: ProjectKind): TemplateElement[] {
  const elements: TemplateElement[] = []
  const visit = (nodes: readonly TemplateNode[], parentKey: string | null) => {
    nodes
      .filter((node) => !node.only || node.only.includes(projectKind))
      .forEach((node, position) => {
        const key = parentKey ? `${parentKey}.${node.slug}` : node.slug
        elements.push({
          key,
          parentKey,
          kind: node.kind,
          name: node.names?.[projectKind] ?? node.name,
          position,
          color: node.color ?? null,
          isAnchor: node.anchor ?? false,
          isPinned: node.pinned ?? false,
        })
        visit(node.children ?? [], key)
      })
  }
  visit(CALENDAR_TEMPLATE, null)
  return elements
}

export interface TemplateDependency {
  predecessorKey: string
  predecessorPoint: DatePoint
  successorKey: string
  successorPoint: DatePoint
  lagAmount: number
  lagUnit: DurationUnit
}

const link = (
  predecessor: [key: string, point: DatePoint],
  successor: [key: string, point: DatePoint],
  lagDays = 0
): TemplateDependency => ({
  predecessorKey: predecessor[0],
  predecessorPoint: predecessor[1],
  successorKey: successor[0],
  successorPoint: successor[1],
  lagAmount: lagDays,
  lagUnit: "days",
})

// Las de la tabla «Dependencias por defecto» de docs/modelo/README.md. Lo que
// no está aquí empieza con el elemento del que cuelga.
const TEMPLATE_LINKS: TemplateDependency[] = [
  link(["rodaje", "start"], ["preparacion", "end"], -1),
  link(["preparacion", "start"], ["softpre", "end"], -1),
  link(["rodaje", "start"], ["postproduccion", "start"]),
  link(["postproduccion", "end"], ["explotacion", "start"], 1),
  link(["explotacion", "end"], ["acreditacion-de-coste", "start"], 1),
  link(["rodaje", "start"], ["rodaje.shooting", "start"]),
  link(["rodaje", "end"], ["rodaje.shooting", "end"]),
  link(["rodaje.shooting", "end"], ["rodaje.wrap", "start"], 1),
  link(["desarrollo", "end"], ["desarrollo.luz-verde", "start"]),
]

/** Cómo se encadenan los elementos de la plantilla, por clave. */
export function buildTemplateDependencies(elements: TemplateElement[]): TemplateDependency[] {
  const keys = new Set(elements.map((element) => element.key))
  const explicit = TEMPLATE_LINKS.filter(
    (dependency) => keys.has(dependency.predecessorKey) && keys.has(dependency.successorKey)
  )
  const startsFixed = new Set(
    explicit
      .filter((dependency) => dependency.successorPoint === "start")
      .map((dependency) => dependency.successorKey)
  )
  const withParent = elements
    .filter(
      (element) =>
        element.parentKey && !element.isAnchor && !element.isPinned && !startsFixed.has(element.key)
    )
    .map((element) => link([element.parentKey!, "start"], [element.key, "start"]))
  return [...explicit, ...withParent]
}
