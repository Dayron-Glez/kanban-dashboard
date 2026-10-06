// Jerárquicas: invalidar ["projects"] refresca todo lo que cuelga de proyectos.
export const queryKeys = {
  projects: {
    all: ["projects"] as const,
    mine: () => [...queryKeys.projects.all, "mine"] as const,
  },
}
