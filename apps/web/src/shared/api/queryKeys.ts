// Jerárquicas: invalidar ["projects", id] refresca todo lo que cuelga de ese proyecto.
export const queryKeys = {
  projects: {
    all: ["projects"] as const,
    mine: () => [...queryKeys.projects.all, "mine"] as const,
    detail: (id: string) => [...queryKeys.projects.all, id] as const,
    members: (id: string) => [...queryKeys.projects.detail(id), "members"] as const,
    invitations: (id: string) => [...queryKeys.projects.detail(id), "invitations"] as const,
  },
  invitations: {
    byToken: (token: string) => ["invitations", token] as const,
  },
}
