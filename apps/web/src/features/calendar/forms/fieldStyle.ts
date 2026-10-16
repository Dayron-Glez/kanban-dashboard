// Cada campo del Sheet, como el selector de fechas: fondo de tarjeta, borde, radio
// de 12 px y letra principal; el texto de ejemplo, en gris y sin negrita.
export const FIELD_SURFACE =
  "bg-card dark:bg-card border-border text-foreground rounded-xl text-base md:text-base shadow-none placeholder:text-muted-foreground placeholder:font-normal"

/** Un campo de una línea: 40 px de alto. */
export const FIELD = `${FIELD_SURFACE} h-10 data-[size=default]:h-10`

/** Entre la etiqueta y su campo, 8 px; entre campo y campo, 16 px (gap-4). */
export const FIELD_GAP = "gap-2"
