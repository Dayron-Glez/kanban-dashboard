import type { ReactNode } from "react"
import { IconAnchor, IconHelpCircle, IconPin } from "@tabler/icons-react"
import { Button, Popover, PopoverContent, PopoverTrigger, cn } from "@/shared/index"
import { phaseTint } from "../lib/phaseColors"

const CHIP = "inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium"

function Entry({
  sample,
  name,
  children,
}: Readonly<{ sample: ReactNode; name: string; children: ReactNode }>) {
  return (
    <div className="grid grid-cols-[56px_1fr] items-center gap-3 py-1">
      <span aria-hidden className="flex justify-center">
        {sample}
      </span>
      <div>
        <p className="text-base">{name}</p>
        <p className="text-muted-foreground text-sm">{children}</p>
      </div>
    </div>
  )
}

const Section = ({ title, children }: Readonly<{ title: string; children: ReactNode }>) => (
  <section aria-label={title} className="mt-2.5">
    <h3 className="text-muted-foreground text-sm font-semibold">{title}</h3>
    {children}
  </section>
)

// Las muestras de barra, con el gris neutro: no son de ninguna fase.
const bar = (isPhase: boolean) => {
  const tint = phaseTint(null, isPhase)
  return (
    <span
      className={cn("inline-block w-10 rounded-[4px]", isPhase ? "h-4" : "h-2.5", tint.className)}
      style={tint.style}
    />
  )
}

/**
 * «Cómo leer el Gantt»: lo que se aprende una vez (barras, fechas escritas a mano,
 * marcas del tiempo y acciones), bajo demanda en lugar de en una leyenda fija.
 */
export function GanttGuide() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Cómo leer el Gantt"
          title="Cómo leer el Gantt"
        >
          <IconHelpCircle className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px]">
        <h2 className="text-base font-semibold">Cómo leer el Gantt</h2>
        <Section title="Barras">
          <Entry sample={bar(true)} name="Fase">
            Cada fase tiene su color; lo de dentro lleva una versión suave
          </Entry>
          <Entry sample={bar(false)} name="Subfase o proceso">
            Más fina que la fase a la que pertenece
          </Entry>
          <Entry
            sample={
              <span className="text-muted-foreground flex items-center">
                <span className="size-2.5 rounded-full border-2 border-current" />
                <span
                  className="h-0.5 w-7"
                  style={{ background: "linear-gradient(90deg, currentColor, transparent)" }}
                />
              </span>
            }
            name="Sin fin"
          >
            Tiene inicio, pero aún no se sabe cuándo acaba
          </Entry>
        </Section>
        <Section title="Fechas escritas a mano">
          <Entry
            sample={
              <span className={cn(CHIP, "bg-primary/10 text-primary")}>
                <IconAnchor size={11} />
                clave
              </span>
            }
            name="Clave"
          >
            De ella se calcula todo el plan
          </Entry>
          <Entry
            sample={
              <span className={cn(CHIP, "bg-muted text-muted-foreground")}>
                <IconPin size={11} />
                fija
              </span>
            }
            name="Fija"
          >
            No cambia cuando se mueve el plan
          </Entry>
        </Section>
        <Section title="Tiempo">
          <Entry sample={<span className="bg-primary h-4 w-0.5" />} name="Hoy">
            Resaltado en la cabecera, con su línea
          </Entry>
          <Entry sample={<span className="bg-primary/45 h-4 w-0.5" />} name="Semana 1">
            Empieza el rodaje; de ella se cuentan las demás
          </Entry>
          <Entry
            sample={
              <span
                className="border-border h-4 w-7 rounded-[3px] border"
                style={{ background: "var(--weekend)" }}
              />
            }
            name="Fin de semana"
          >
            Las columnas sombreadas
          </Entry>
        </Section>
        <Section title="Acciones">
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Las de un día van arriba en su fila «Acciones»; los periodos, debajo, como una línea (la
            contratación, discontinua). Varias el mismo día se suman en un número. Los botones de
            cada tipo, sobre el Gantt, las ocultan o muestran.
          </p>
        </Section>
        <p className="text-muted-foreground border-border mt-3 border-t pt-2.5 text-sm">
          Pasa el ratón por cualquier marca para ver qué es. Las marcas del tiempo se apagan en{" "}
          <span className="text-foreground font-medium">Vista</span>.
        </p>
      </PopoverContent>
    </Popover>
  )
}
