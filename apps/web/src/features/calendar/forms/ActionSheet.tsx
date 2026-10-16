import { CreateActionSheet, type CreateActionSheetProps } from "./CreateActionSheet"
import { EditActionSheet, type EditActionSheetProps } from "./EditActionSheet"

/**
 * El Sheet de una acción, para crearla o para editarla, con el mismo formulario:
 * tipo y título arriba, lo esencial abierto y lo demás plegado con su resumen.
 */
export function ActionSheet(props: Readonly<CreateActionSheetProps | EditActionSheetProps>) {
  return props.mode === "edit" ? <EditActionSheet {...props} /> : <CreateActionSheet {...props} />
}
