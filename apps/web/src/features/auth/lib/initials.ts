/** Iniciales para el avatar: nombre + apellido, o las dos primeras letras. */
export const getInitials = (fullName: string | undefined, email: string | undefined): string => {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return (email ?? "?").slice(0, 2).toUpperCase()
}
