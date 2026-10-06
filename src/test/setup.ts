import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { wireApi } from "../app/wireApi";
import { resetDb } from "../mocks/db";
import { mockConfig, resetMockMode } from "../mocks/mode";
import { server } from "../mocks/server";
import { useAuthStore } from "../stores/authStore";
import { useSelectionStore } from "../stores/selectionStore";
import { useThemeStore } from "../stores/themeStore";
import { useToastStore } from "../stores/toastStore";

const defaultRandom = mockConfig.random;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  wireApi();
  useAuthStore.setState({ token: "test-token", notice: null });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetDb();
  resetMockMode();
  mockConfig.slowMs = 2000;
  mockConfig.random = defaultRandom;
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  useThemeStore.setState({ theme: "system" });
  useSelectionStore.getState().clear();
  useToastStore.setState({ toasts: [] });
  Reflect.deleteProperty(window, "matchMedia");
  window.history.replaceState(null, "", "/");
});

afterAll(() => server.close());
