import { configureApi } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import { useSelectionStore } from "../stores/selectionStore";

export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";

/** Connects the API client to the auth store: it reads the token and signs out on any 401. */
export function wireApi(): void {
  configureApi({
    getToken: () => useAuthStore.getState().token,
    onUnauthorized: () => {
      useSelectionStore.getState().clear();
      useAuthStore.getState().signOut(SESSION_EXPIRED_MESSAGE);
    },
  });
}
