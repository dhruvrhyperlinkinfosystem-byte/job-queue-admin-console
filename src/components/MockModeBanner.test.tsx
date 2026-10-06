import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuthStore } from "../stores/authStore";
import { renderAt } from "../test/utils";

describe("mock mode banner", () => {
  beforeEach(() => useAuthStore.setState({ token: "abc" }));

  it("is hidden in normal mode", async () => {
    renderAt("/");
    await screen.findByRole("heading", { name: "Queues" });
    expect(screen.queryByText(/mock mode/i)).not.toBeInTheDocument();
  });

  it("names the active mode, including after in-app navigation drops the query", async () => {
    const user = userEvent.setup();
    renderAt("/?mock=flaky");
    expect(await screen.findByText(/mock mode/i)).toHaveTextContent("flaky");

    await user.click(screen.getByRole("link", { name: "Jobs" }));
    expect(window.location.search).toBe("");
    expect(screen.getByText(/mock mode/i)).toHaveTextContent("flaky");
  });

  it("switches back to normal from the banner, keeping the rest of the URL", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?status=dead&mock=errors");
    await user.click(await screen.findByRole("link", { name: /switch back to normal/i }));

    expect(window.location.search).toContain("status=dead");
    expect(window.location.search).toContain("mock=normal");
    expect(await screen.findByText(/Showing 1–/)).toBeInTheDocument();
    expect(screen.queryByText(/mock mode/i)).not.toBeInTheDocument();
  });
});
