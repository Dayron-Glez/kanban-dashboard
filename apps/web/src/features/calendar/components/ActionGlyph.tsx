import {
  IconBell,
  IconBriefcase,
  IconFlag,
  IconSquareCheck,
  IconUsers,
  type Icon,
} from "@tabler/icons-react"
import type { ActionKind } from "@repo/contracts"
import { cn } from "@/shared/index"
import { ACTION_COLOR } from "../lib/actionStyle"

// Un icono por tipo, que se reconoce sin leyenda, con el color de su tipo.
const ICONS: Record<ActionKind, Icon> = {
  event: IconFlag,
  task: IconSquareCheck,
  meeting: IconUsers,
  reminder: IconBell,
  hiring: IconBriefcase,
}

export function ActionGlyph({
  kind,
  className,
}: Readonly<{ kind: ActionKind; className?: string }>) {
  const Glyph = ICONS[kind]
  return <Glyph aria-hidden className={cn("size-4 shrink-0", ACTION_COLOR[kind], className)} />
}
