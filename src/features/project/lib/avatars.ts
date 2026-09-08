/** Paleta e iniciales de los avatares de miembros. */

const AVATAR_COLORS = [
  { bg: "rgba(99,102,241,.14)", txt: "#6366f1" },
  { bg: "rgba(16,185,129,.14)", txt: "#059669" },
  { bg: "rgba(249,115,22,.14)", txt: "#ea580c" },
  { bg: "rgba(14,165,233,.14)", txt: "#0284c7" },
  { bg: "rgba(168,85,247,.14)", txt: "#9333ea" },
]

export const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?"
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export const getAvatarColor = (userId: string) =>
  AVATAR_COLORS[userId.charCodeAt(userId.length - 1) % AVATAR_COLORS.length]
