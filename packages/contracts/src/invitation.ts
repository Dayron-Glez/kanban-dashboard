import * as z from "zod"
import { InvitationStatusSchema } from "./enums.js"

// El email de lectura es string a secas: si alguna fila antigua no fuera un
// email válido, rechazarla dejaría sin cargar la lista entera.
export const InvitationSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  email: z.string(),
  token: z.uuid(),
  status: InvitationStatusSchema,
  expiresAt: z.iso.datetime({ offset: true }),
  createdAt: z.iso.datetime({ offset: true }),
})
export type Invitation = z.infer<typeof InvitationSchema>

/** Lo que ve quien abre el enlace, antes de ser miembro: sin el token. */
export const InvitationPreviewSchema = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  projectName: z.string(),
  email: z.string(),
  status: InvitationStatusSchema,
  expiresAt: z.iso.datetime({ offset: true }),
})
export type InvitationPreview = z.infer<typeof InvitationPreviewSchema>

export const CreateInvitationInputSchema = z.object({
  projectId: z.uuid(),
  email: z.email(),
})
export type CreateInvitationInput = z.infer<typeof CreateInvitationInputSchema>
