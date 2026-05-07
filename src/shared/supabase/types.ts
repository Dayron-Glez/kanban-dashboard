export type TaskPriority = "p0" | "p1" | "p2"
export type TaskSize = "xs" | "s" | "m" | "l" | "xl"
export type MemberRole = "owner" | "member"
export type InvitationStatus = "pending" | "accepted"

export type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  updated_at: string
}

export type Project = {
  id: string
  owner_id: string
  name: string
  description: string | null
  color: string
  created_at: string
}

export type ProjectMember = {
  id: string
  project_id: string
  user_id: string
  role: MemberRole
  is_favorite: boolean
  joined_at: string
  profiles?: Profile
}

export type ProjectInvitation = {
  id: string
  project_id: string
  email: string
  token: string
  status: InvitationStatus
  expires_at: string
  created_at: string
}

export type Column = {
  id: string
  project_id: string
  title: string
  position: number
}

export type Task = {
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

export type TaskHistory = {
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
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          email: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          color?: string
          created_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: MemberRole
          is_favorite: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: MemberRole
          is_favorite?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: MemberRole
          is_favorite?: boolean
          joined_at?: string
        }
        Relationships: []
      }
      project_invitations: {
        Row: {
          id: string
          project_id: string
          email: string
          token: string
          status: InvitationStatus
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          email: string
          token: string
          status?: InvitationStatus
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          email?: string
          token?: string
          status?: InvitationStatus
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      columns: {
        Row: { id: string; project_id: string; title: string; position: number }
        Insert: { id?: string; project_id: string; title: string; position: number }
        Update: { id?: string; project_id?: string; title?: string; position?: number }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          column_id: string
          project_id: string
          assignee_id: string | null
          content: string
          priority: TaskPriority
          size: TaskSize
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          column_id: string
          project_id: string
          assignee_id?: string | null
          content: string
          priority: TaskPriority
          size: TaskSize
          position: number
          created_at?: string
        }
        Update: {
          id?: string
          column_id?: string
          project_id?: string
          assignee_id?: string | null
          content?: string
          priority?: TaskPriority
          size?: TaskSize
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      task_history: {
        Row: {
          id: string
          task_id: string
          from_column_id: string | null
          to_column_id: string
          moved_at: string
        }
        Insert: {
          id?: string
          task_id: string
          from_column_id?: string | null
          to_column_id: string
          moved_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          from_column_id?: string | null
          to_column_id?: string
          moved_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
