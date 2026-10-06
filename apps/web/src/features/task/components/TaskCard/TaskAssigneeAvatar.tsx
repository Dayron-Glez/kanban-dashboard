import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/index"
import type { Task } from "@/features/board/index"

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface TaskAssigneeAvatarProps {
  profile: NonNullable<Task["assigneeProfile"]>
}

export function TaskAssigneeAvatar({ profile }: Readonly<TaskAssigneeAvatarProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="bg-primary/15 text-primary flex h-5.5 w-5.5 shrink-0 cursor-default items-center justify-center rounded-full text-[9px] font-extrabold">
          {getInitials(profile.full_name)}
        </div>
      </TooltipTrigger>

      <TooltipContent side="top" align="end" sideOffset={6} className="flex flex-col gap-0.5">
        <span className="font-medium">{profile.full_name ?? "Sin nombre"}</span>
        {profile.email && <span className="text-xs opacity-75">{profile.email}</span>}
      </TooltipContent>
    </Tooltip>
  )
}
