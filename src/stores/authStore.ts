import { create } from "zustand";
import { readStorage, writeStorage } from "../lib/storage";

const TOKEN_KEY = "token";

interface AuthState {
  token: string | null;
  /** One-off message for the sign-in screen, e.g. why the user was signed out. */
  notice: string | null;
  signIn: (token: string) => void;
  signOut: (notice?: string) => void;
  clearNotice: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: readStorage(TOKEN_KEY),
  notice: null,
  signIn: (token) => {
    writeStorage(TOKEN_KEY, token);
    set({ token, notice: null });
  },
  signOut: (notice) => {
    writeStorage(TOKEN_KEY, null);
    set({ token: null, notice: notice ?? null });
  },
  clearNotice: () => set({ notice: null }),
}));
