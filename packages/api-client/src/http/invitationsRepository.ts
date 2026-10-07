import {
  AcceptedInvitationSchema,
  InvitationPreviewSchema,
  InvitationSchema,
} from "@repo/contracts"
import * as z from "zod"
import type { InvitationsRepository } from "../ApiClient"
import { isApiError } from "../errors"
import type { HttpClient } from "./httpClient"

export const createInvitationsRepository = (http: HttpClient): InvitationsRepository => ({
  listPending: (projectId) =>
    http.request("GET", `/projects/${projectId}/invitations`, {
      schema: z.array(InvitationSchema),
    }),

  create: ({ projectId, email }) =>
    http.request("POST", `/projects/${projectId}/invitations`, {
      body: { email },
      schema: InvitationSchema,
    }),

  cancel: (id) => http.request("DELETE", `/invitations/${id}`),

  findByToken: async (token) => {
    try {
      return await http.request("GET", `/invitations/token/${token}`, {
        schema: InvitationPreviewSchema,
      })
    } catch (error) {
      if (isApiError(error) && error.code === "not_found") return null
      throw error
    }
  },

  accept: async (token) => {
    const { projectId } = await http.request("POST", `/invitations/token/${token}/accept`, {
      schema: AcceptedInvitationSchema,
    })
    return projectId
  },
})
