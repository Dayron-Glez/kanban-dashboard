import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/index"
import type { Profile } from "@repo/contracts"

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
  profile: Profile
}

export function TaskAssigneeAvatar({ profile }: Readonly<TaskAssigneeAvatarProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="bg-primary/15 text-primary flex h-5.5 w-5.5 shrink-0 cursor-default items-center justify-center rounded-full text-[9px] font-extrabold">
          {getInitials(profile.fullName)}
        </div>
      </TooltipTrigger>

      <TooltipContent side="top" align="end" sideOffset={6} className="flex flex-col gap-0.5">
        <span className="font-medium">{profile.fullName ?? "Sin nombre"}</span>
        {profile.email && <span className="text-xs opacity-75">{profile.email}</span>}
      </TooltipContent>
    </Tooltip>
  )
}
