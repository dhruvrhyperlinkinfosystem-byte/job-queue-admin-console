import { screen, within } from "@testing-library/react";
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

  it("announces a successful sign-in with a toast", async () => {
    const user = userEvent.setup();
    renderAt("/signin");
    await user.type(screen.getByLabelText("Access token"), "my-token");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Signed in successfully.")).toBeInTheDocument();
  });

  it("does not toast when the token is rejected by validation", async () => {
    const user = userEvent.setup();
    renderAt("/signin");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.queryByText("Signed in successfully.")).not.toBeInTheDocument();
  });

  it("redirects signed-in users away from sign-in", async () => {
    useAuthStore.setState({ token: "abc" });
    renderAt("/signin");
    expect(await screen.findByRole("heading", { name: "Queues" })).toBeInTheDocument();
  });
});

describe("sign-out confirmation", () => {
  beforeEach(() => useAuthStore.setState({ token: "abc" }));

  async function openDialog(user: ReturnType<typeof userEvent.setup>) {
    renderAt("/");
    const trigger = await screen.findByRole("button", { name: "Sign out" });
    await user.click(trigger);
    return { trigger, dialog: screen.getByRole("dialog", { name: "Sign out?" }) };
  }

  it("asks before signing out and does nothing until confirmed", async () => {
    const user = userEvent.setup();
    const { dialog } = await openDialog(user);
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(useAuthStore.getState().token).toBe("abc");
    expect(screen.queryByLabelText("Access token")).not.toBeInTheDocument();
  });

  it("signs out, returns to sign-in and confirms with a toast", async () => {
    const user = userEvent.setup();
    const { dialog } = await openDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Sign out" }));

    expect(await screen.findByLabelText("Access token")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(screen.getByText("You have been signed out.")).toBeInTheDocument();
    // A deliberate sign-out is not an expired session.
    expect(screen.queryByText(/session has expired/i)).not.toBeInTheDocument();
  });

  it("keeps the session on Cancel and returns focus to the button", async () => {
    const user = userEvent.setup();
    const { trigger, dialog } = await openDialog(user);
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useAuthStore.getState().token).toBe("abc");
    expect(trigger).toHaveFocus();
    expect(screen.queryByText("You have been signed out.")).not.toBeInTheDocument();
  });

  it("closes on Escape without signing out, and traps focus meanwhile", async () => {
    const user = userEvent.setup();
    const { trigger, dialog } = await openDialog(user);
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    const confirm = within(dialog).getByRole("button", { name: "Sign out" });
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useAuthStore.getState().token).toBe("abc");
    expect(trigger).toHaveFocus();
  });

  it("shows the expired-session message, not the sign-out toast, after a 401", async () => {
    useAuthStore.setState({ token: "expired" });
    renderAt("/jobs");
    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
    expect(screen.queryByText("You have been signed out.")).not.toBeInTheDocument();
  });
});
