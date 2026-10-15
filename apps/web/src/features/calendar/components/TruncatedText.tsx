import { useRef, useState } from "react"
import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/index"

/** Un texto en una línea que, si no cabe y se corta, se lee entero en un Tooltip. */
export function TruncatedText({ text, className }: Readonly<{ text: string; className?: string }>) {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState<boolean>(false)
  const cut = () => {
    const element = ref.current
    return element != null && element.scrollWidth > element.clientWidth
  }

  return (
    <Tooltip open={open} onOpenChange={(next) => setOpen(next && cut())}>
      <TooltipTrigger asChild>
        <span ref={ref} className={cn("min-w-0 truncate", className)}>
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}
