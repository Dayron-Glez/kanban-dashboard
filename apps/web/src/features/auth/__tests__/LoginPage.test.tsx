import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes, useLocation } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LoginPage } from "../components/LoginPage"
import { authClient } from "../lib/authClient"

vi.mock("../context/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

vi.mock("../lib/authClient", () => ({
  authClient: { signIn: { email: vi.fn(), social: vi.fn() } },
}))

function CurrentSearch() {
  return <output data-testid="search">{useLocation().search}</output>
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/login"
          element={
            <>
              <LoginPage />
              <CurrentSearch />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )

beforeEach(() => {
  vi.mocked(authClient.signIn.social).mockResolvedValue({ data: null, error: null } as never)
})

describe("LoginPage", () => {
  it("muestra el error con el que vuelve de Google y lo quita de la URL", () => {
    renderAt("/login?redirect=%2Fprojects%2F1&error=account_not_linked")

    expect(screen.getByText(/Ya existe una cuenta con este correo/)).toBeInTheDocument()
    expect(screen.getByTestId("search")).toHaveTextContent("?redirect=%2Fprojects%2F1")
  })

  it("pide a better-auth que los errores de Google vuelvan al login, con su redirect", async () => {
    renderAt("/login?redirect=%2Fprojects%2F1")

    await userEvent.click(screen.getByRole("button", { name: "Google" }))

    expect(authClient.signIn.social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: `${window.location.origin}/projects/1`,
      errorCallbackURL: `${window.location.origin}/login?redirect=%2Fprojects%2F1`,
    })
  })

  it("sin redirect, los errores vuelven a /login a secas", async () => {
    renderAt("/login")

    await userEvent.click(screen.getByRole("button", { name: "Google" }))

    expect(authClient.signIn.social).toHaveBeenCalledWith(
      expect.objectContaining({ errorCallbackURL: `${window.location.origin}/login` })
    )
  })
})
