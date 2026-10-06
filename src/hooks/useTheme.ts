import { useCallback, useEffect, useSyncExternalStore } from "react";
import { resolveTheme, useThemeStore, type ResolvedTheme } from "../stores/themeStore";

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const getSnapshot = () =>
  typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;

export function useTheme() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const systemPrefersDark = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const resolved: ResolvedTheme = resolveTheme(theme, systemPrefersDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const toggle = useCallback(
    () => setTheme(resolved === "dark" ? "light" : "dark"),
    [resolved, setTheme],
  );

  return { theme, resolved, toggle };
}
