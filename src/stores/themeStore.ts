import { create } from "zustand";
import { readStorage, writeStorage } from "../lib/storage";

export type Theme = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

// The raw string is read by the inline script in index.html before first paint.
const THEME_KEY = "theme";

function readTheme(): Theme {
  const stored = readStorage(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: readTheme(),
  setTheme: (theme) => {
    writeStorage(THEME_KEY, theme);
    set({ theme });
  },
}));

export function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme;
}
