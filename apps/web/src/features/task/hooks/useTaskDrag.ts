import { useCallback, useState } from "react"
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/utils/combine"
import { attachClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge/attach-closest-edge"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge/extract-closest-edge"
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/types"
import { isTaskDragData, taskDragData } from "@/features/board/index"

export function useTaskDrag(taskId: string, columnId: string) {
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dropEdge, setDropEdge] = useState<Edge | null>(null)

  // useCallback es imprescindible: un ref callback nuevo en cada render
  // desregistraría la tarjeta en mitad del arrastre.
  const dragRef = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return

      return combine(
        draggable({
          element,
          getInitialData: () => taskDragData(taskId, columnId),
          onDragStart: () => setIsDragging(true),
          onDrop: () => setIsDragging(false),
        }),
        dropTargetForElements({
          element,
          canDrop: ({ source }) => isTaskDragData(source.data) && source.data.taskId !== taskId,
          getData: ({ input }) =>
            attachClosestEdge(taskDragData(taskId, columnId), {
              element,
              input,
              allowedEdges: ["top", "bottom"],
            }),
          onDrag: ({ self }) => setDropEdge(extractClosestEdge(self.data)),
          onDragLeave: () => setDropEdge(null),
          onDrop: () => setDropEdge(null),
        })
      )
    },
    [taskId, columnId]
  )

  return { dragRef, isDragging, dropEdge }
}
