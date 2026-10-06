import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types"

export function TaskDropIndicator({ edge }: Readonly<{ edge: Edge }>) {
  return (
    <div
      className={`bg-primary pointer-events-none absolute inset-x-0 h-0.5 rounded-full ${
        edge === "top" ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2"
      }`}
    />
  )
}
