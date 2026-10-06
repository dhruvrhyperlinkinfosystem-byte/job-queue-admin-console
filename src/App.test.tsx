import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "./App";
import { useAuthStore } from "./stores/authStore";

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("routing and auth", () => {
  it("sends signed-out visitors to the sign-in screen", () => {
    useAuthStore.setState({ token: null });
    renderApp("/jobs");
    expect(screen.getByRole("heading", { name: /job queue admin/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/access token/i)).toBeInTheDocument();
  });

  it("shows a not-found page for unknown routes", () => {
    renderApp("/nope");
    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
  });
});
