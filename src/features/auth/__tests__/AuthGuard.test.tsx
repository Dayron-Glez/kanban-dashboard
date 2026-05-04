import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { describe, expect, it, vi } from "vitest"
import { AuthGuard } from "../components/AuthGuard"

vi.mock("../context/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}))

describe("AuthGuard", () => {
  it("redirige a /login cuando no hay sesión activa", () => {
    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <Routes>
          <Route path="/login" element={<p>Página de login</p>} />
          <Route element={<AuthGuard />}>
            <Route path="/projects" element={<p>Proyectos</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText("Página de login")).toBeInTheDocument()
    expect(screen.queryByText("Proyectos")).not.toBeInTheDocument()
  })
})
