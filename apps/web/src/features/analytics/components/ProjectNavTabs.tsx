import { Link, useLocation, useParams } from "react-router"
import { IconChartBar, IconLayoutKanban } from "@tabler/icons-react"

export function ProjectNavTabs() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const isAnalytics = location.pathname.endsWith("/analytics")

  const tabs = [
    { label: "Tablero", path: `/projects/${id}`, icon: IconLayoutKanban, active: !isAnalytics },
    {
      label: "Analytics",
      path: `/projects/${id}/analytics`,
      icon: IconChartBar,
      active: isAnalytics,
    },
  ]

  return (
    <nav className="bg-background border-border flex gap-1 border-b px-6">
      {tabs.map(({ label, path, icon: Icon, active }) => (
        <Link
          key={path}
          to={path}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            active
              ? "border-primary text-primary"
              : "text-muted-foreground hover:text-primary hover:border-primary/50 border-transparent"
          }`}
        >
          <Icon size={16} />
          {label}
        </Link>
      ))}
    </nav>
  )
}
