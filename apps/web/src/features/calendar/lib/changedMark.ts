// La marca cian de un campo cambiado y sin guardar, a la izquierda.
export const changedMark = (changed: boolean) =>
  changed &&
  "relative before:bg-primary before:absolute before:inset-y-0 before:-left-3 before:w-0.5 before:rounded-full"
