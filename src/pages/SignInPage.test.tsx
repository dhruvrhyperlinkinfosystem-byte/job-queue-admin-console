import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuthStore } from "../stores/authStore";
import { renderAt } from "../test/utils";

describe("sign-in", () => {
  beforeEach(() => useAuthStore.setState({ token: null }));

  it("validates the token before signing in", async () => {
    const user = userEvent.setup();
    renderAt("/signin");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    const input = screen.getByLabelText("Access token");
    expect(screen.getByText("Enter an access token.")).toBeInTheDocument();
    expect(input).toBeInvalid();

    await user.type(input, "has space");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByText("A token cannot contain spaces.")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it("stores the token, sends it on every call and lands on the queues screen", async () => {
    const user = userEvent.setup();
    renderAt("/signin");
    await user.type(screen.getByLabelText("Access token"), "my-token");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { name: "Queues" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "email" })).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBe("my-token");
  });

  it("signs out and returns to sign-in", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ token: "abc" });
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByLabelText("Access token")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("redirects signed-in users away from sign-in", async () => {
    useAuthStore.setState({ token: "abc" });
    renderAt("/signin");
    expect(await screen.findByRole("heading", { name: "Queues" })).toBeInTheDocument();
  });
});
