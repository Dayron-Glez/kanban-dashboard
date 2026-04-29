export type TaskPriority = "p0" | "p1" | "p2"
export type TaskSize = "xs" | "s" | "m" | "l" | "xl"
export type MemberRole = "owner" | "member"
export type InvitationStatus = "pending" | "accepted"

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  updated_at: string
}

export interface Project {
  id: string
  owner_id: string
  name: string
  description: string | null
  color: string
  created_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: MemberRole
  joined_at: string
  profiles?: Profile
}

export interface ProjectInvitation {
  id: string
  project_id: string
  email: string
  token: string
  status: InvitationStatus
  expires_at: string
  created_at: string
}

export interface Column {
  id: string
  project_id: string
  title: string
  position: number
}

export interface Task {
  id: string
  column_id: string
  project_id: string
  assignee_id: string | null
  content: string
  priority: TaskPriority
  size: TaskSize
  position: number
  created_at: string
  profiles?: Profile
}

export interface TaskHistory {
  id: string
  task_id: string
  from_column_id: string | null
  to_column_id: string
  moved_at: string
  tasks?: Task
  from_column?: Column
  to_column?: Column
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile }
      projects: { Row: Project }
      project_members: { Row: ProjectMember }
      project_invitations: { Row: ProjectInvitation }
      columns: { Row: Column }
      tasks: { Row: Task }
      task_history: { Row: TaskHistory }
    }
  }
}
