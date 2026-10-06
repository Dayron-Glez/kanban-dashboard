import type { MemberRole } from "@/shared/supabase"

/**
 * Piezas compartidas entre la página de Ajustes y la de Miembros, que antes
 * eran una sola pantalla.
 */

// ── RoleBadge ──────────────────────────────────────────────────────────────
export const RoleBadge = ({ role }: { role: MemberRole }) => (
  <span
    className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-wide whitespace-nowrap ${
      role === "owner" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
    }`}
  >
    {role === "owner" ? "Propietario" : "Miembro"}
  </span>
)

// ── CardHead ───────────────────────────────────────────────────────────────
export type ChipVariant = "default" | "warn" | "danger"

const chipClass: Record<ChipVariant, string> = {
  default: "bg-primary/10 text-primary",
  warn: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
  danger: "bg-red-100   dark:bg-red-950/40   text-red-600   dark:text-red-400",
}

interface CardHeadProps {
  icon: React.ReactNode
  variant?: ChipVariant
  title: string
  count?: number
  note?: string
}

export const CardHead = ({ icon, variant = "default", title, count, note }: CardHeadProps) => (
  <div className="border-border flex items-center gap-[9px] border-b px-4 py-3">
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${chipClass[variant]}`}
    >
      {icon}
    </div>
    <span className="text-foreground flex-1 text-[13px] font-bold">{title}</span>
    {count != null && (
      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10.5px] font-bold">
        {count}
      </span>
    )}
    {note && <span className="text-muted-foreground text-[11.5px]">{note}</span>}
  </div>
)
