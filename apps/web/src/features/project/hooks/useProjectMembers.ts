import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/shared/supabase"
import type { ProjectInvitation, ProjectMember, MemberRole } from "@/shared/supabase"

export const useProjectMembers = (projectId: string) => {
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const [{ data: membersRaw }, { data: invitationsData }] = await Promise.all([
        supabase.from("project_members").select("*").eq("project_id", projectId),
        supabase
          .from("project_invitations")
          .select("*")
          .eq("project_id", projectId)
          .eq("status", "pending"),
      ])

      if (cancelled) return

      // Cargar perfiles por separado
      const memberIds = (membersRaw ?? []).map((m) => m.user_id as string)
      const profilesMap: Record<
        string,
        {
          id: string
          full_name: string | null
          avatar_url: string | null
          email: string | null
          updated_at: string
        }
      > = {}
      if (memberIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email, updated_at")
          .in("id", memberIds)
        for (const p of profilesData ?? []) profilesMap[p.id] = p
      }

      if (cancelled) return

      setMembers(
        (membersRaw ?? []).map((m) => ({
          id: m.id,
          project_id: m.project_id,
          user_id: m.user_id,
          role: m.role as MemberRole,
          is_favorite: m.is_favorite ?? false,
          joined_at: m.joined_at,
          profiles: profilesMap[m.user_id] ?? undefined,
        }))
      )
      setInvitations(invitationsData ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [projectId, tick])

  const inviteMember = async (email: string): Promise<{ token: string } | null> => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const token = crypto.randomUUID()
    const { data, error } = await supabase
      .from("project_invitations")
      .insert({ project_id: projectId, email, token, expires_at: expiresAt })
      .select()
      .single()
    if (error || !data) return null
    setInvitations((prev) => [data, ...prev])
    return { token: data.token }
  }

  const cancelInvitation = async (id: string): Promise<void> => {
    await supabase.from("project_invitations").delete().eq("id", id)
    setInvitations((prev) => prev.filter((inv) => inv.id !== id))
  }

  const removeMember = async (memberId: string): Promise<void> => {
    await supabase.from("project_members").delete().eq("id", memberId)
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  return { members, invitations, loading, inviteMember, cancelInvitation, removeMember, reload }
}
