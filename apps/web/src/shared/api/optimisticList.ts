import type { QueryClient, QueryKey } from "@tanstack/react-query"

interface WithId {
  id: string
}

export const removeOptimistically = async <T extends WithId>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  id: string
) => {
  await queryClient.cancelQueries({ queryKey })
  const removed = queryClient.getQueryData<T[]>(queryKey)?.find((item) => item.id === id)
  queryClient.setQueryData<T[]>(queryKey, (list) => list?.filter((item) => item.id !== id))
  return { removed }
}

// Se reinserta solo el elemento quitado, no una foto de la lista: así no se
// deshacen otros borrados que hayan terminado bien entretanto.
export const restoreRemoved = <T extends WithId>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  removed: T | undefined
) => {
  if (!removed) return
  queryClient.setQueryData<T[]>(queryKey, (list) =>
    list && !list.some((item) => item.id === removed.id) ? [...list, removed] : list
  )
}
