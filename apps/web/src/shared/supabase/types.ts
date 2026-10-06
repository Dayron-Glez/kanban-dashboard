import type { Tables } from "@repo/api-client"

export type MemberRole = "owner" | "member"

export type Profile = Tables<"profiles">
export type Project = Tables<"projects">

// role es text con CHECK: el tipo generado dice string y aquí se estrecha a la
// unión hasta que los repositorios validen con Zod.
export type ProjectMember = Omit<Tables<"project_members">, "role"> & {
  role: MemberRole
  profiles?: Profile
}
