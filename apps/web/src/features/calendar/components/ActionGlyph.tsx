import type { ActionKind } from "@repo/contracts"
import { cn } from "@/shared/index"

// Una forma por tipo, para distinguirlos sin depender del color, que es el de la fase.
const SHAPES: Record<ActionKind, string> = {
  event: "size-2.5 rotate-45 scale-[.85] rounded-[2px] bg-current",
  task: "h-1.5 w-[18px] rounded-full bg-current",
  meeting: "size-2.5 rounded-full bg-current",
  reminder: "size-2.5 rounded-full border-2 border-current",
  hiring:
    "h-1.5 w-[18px] rounded-full bg-[repeating-linear-gradient(90deg,currentColor_0_4px,transparent_4px_6px)]",
}

export function ActionGlyph({
  kind,
  className,
}: Readonly<{ kind: ActionKind; className?: string }>) {
  return <span aria-hidden className={cn("inline-block shrink-0", SHAPES[kind], className)} />
}
