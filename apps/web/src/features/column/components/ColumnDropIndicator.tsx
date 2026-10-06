import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types"

export function ColumnDropIndicator({ edge }: Readonly<{ edge: Edge }>) {
  return (
    <div
      className={`pointer-events-none absolute inset-y-0 z-10 flex w-1 flex-col items-center ${
        edge === "left" ? "-left-2" : "-right-2"
      }`}
    >
      <span className="border-primary bg-background size-2.5 shrink-0 rounded-full border-2" />
      <span className="bg-primary w-1 flex-1 rounded-full" />
      <span className="border-primary bg-background size-2.5 shrink-0 rounded-full border-2" />
    </div>
  )
}
