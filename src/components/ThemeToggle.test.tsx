import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuthStore } from "../stores/authStore";
import { renderAt, stubMatchMedia } from "../test/utils";

const isDark = () => document.documentElement.classList.contains("dark");
const toggle = () => screen.getByRole("button", { name: "Dark mode" });

describe("theme toggle", () => {
  beforeEach(() => useAuthStore.setState({ token: null }));

  it("follows the system preference by default", () => {
    stubMatchMedia(true);
    renderAt("/signin");
    expect(isDark()).toBe(true);
    expect(toggle()).toHaveAttribute("aria-pressed", "true");
  });

  it("starts light when the system prefers light", () => {
    stubMatchMedia(false);
    renderAt("/signin");
    expect(isDark()).toBe(false);
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
  });

  it("switches theme manually and remembers the choice", async () => {
    const user = userEvent.setup();
    stubMatchMedia(true);
    renderAt("/signin");

    await user.click(toggle());
    expect(isDark()).toBe(false);
    expect(toggle()).toHaveAttribute("aria-pressed", "false");
    expect(localStorage.getItem("theme")).toBe("light");

    await user.click(toggle());
    expect(isDark()).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("restores the saved choice on the next visit, over the system preference", async () => {
    localStorage.setItem("theme", "light");
    vi.resetModules();
    const { useThemeStore } = await import("../stores/themeStore");
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("follows system changes until the user picks a theme", async () => {
    const user = userEvent.setup();
    const media = stubMatchMedia(false);
    renderAt("/signin");
    expect(isDark()).toBe(false);

    media.setPrefersDark(true);
    await vi.waitFor(() => expect(isDark()).toBe(true));

    await user.click(toggle()); // explicit choice: light
    media.setPrefersDark(false);
    media.setPrefersDark(true);
    expect(isDark()).toBe(false);
  });

  it("is available inside the app shell too", async () => {
    stubMatchMedia(false);
    useAuthStore.setState({ token: "abc" });
    renderAt("/");
    expect(await screen.findByRole("button", { name: "Dark mode" })).toBeInTheDocument();
  });
});
