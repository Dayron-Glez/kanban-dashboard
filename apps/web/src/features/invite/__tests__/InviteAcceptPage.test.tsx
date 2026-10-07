import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { InvitationPreview } from "@repo/contracts"
import { MemoryRouter, Route, Routes } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createFakeApi, createWrapper } from "@/shared/api/testing"
import InviteAcceptPage from "../InviteAcceptPage"

const auth = vi.hoisted(() => ({
  current: { user: null as { email: string } | null, loading: false },
}))

vi.mock("@/features/auth", () => ({ useAuth: () => auth.current }))

const TOKEN = "9b2f4c1e-3d5a-4b6c-8d7e-0f1a2b3c4d5e"
const PROJECT_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7"

const preview = (overrides: Partial<InvitationPreview> = {}): InvitationPreview => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  projectId: PROJECT_ID,
  projectName: "Largometraje",
  email: "luis@cauce.test",
  status: "pending",
  expiresAt: "2999-01-01T00:00:00+00:00",
  ...overrides,
})

let api: ReturnType<typeof createFakeApi>

const renderPage = () => {
  const Wrapper = createWrapper(api)
  render(
    <Wrapper>
      <MemoryRouter initialEntries={[`/invite/${TOKEN}`]}>
        <Routes>
          <Route path="/invite/:token" element={<InviteAcceptPage />} />
          <Route path="/projects/:id" element={<p>Tablero del proyecto</p>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>
  )
}

beforeEach(() => {
  api = createFakeApi()
  auth.current = { user: { email: "luis@cauce.test" }, loading: false }
})

describe("InviteAcceptPage", () => {
  it("sin sesión pide iniciarla y no consulta la invitación", () => {
    auth.current = { user: null, loading: false }

    renderPage()

    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument()
    expect(api.invitations.findByToken).not.toHaveBeenCalled()
  })

  it("muestra el proyecto y solo se une cuando se confirma", async () => {
    api.invitations.findByToken.mockResolvedValue(preview())
    api.invitations.accept.mockResolvedValue(PROJECT_ID)
    api.projects.listMine.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText("Te han invitado a «Largometraje»")).toBeInTheDocument()
    expect(api.invitations.accept).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Unirme al proyecto" }))

    expect(await screen.findByText("Tablero del proyecto")).toBeInTheDocument()
    expect(api.invitations.accept).toHaveBeenCalledWith(TOKEN)
  })

  it("avisa si la invitación es para otra cuenta", async () => {
    api.invitations.findByToken.mockResolvedValue(preview({ email: "otra@cauce.test" }))

    renderPage()

    expect(await screen.findByText("La invitación es para otra cuenta")).toBeInTheDocument()
  })

  it("avisa si ha caducado", async () => {
    api.invitations.findByToken.mockResolvedValue(
      preview({ expiresAt: "2020-01-01T00:00:00+00:00" })
    )

    renderPage()

    expect(await screen.findByText("Invitación expirada")).toBeInTheDocument()
  })

  it("avisa si el token no existe", async () => {
    api.invitations.findByToken.mockResolvedValue(null)

    renderPage()

    expect(await screen.findByText("El enlace de invitación no existe.")).toBeInTheDocument()
  })
})
