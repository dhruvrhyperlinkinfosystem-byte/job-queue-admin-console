import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { configureApi } from "../api/client";
import { resetDb } from "../mocks/db";
import { mockConfig, resetMockMode } from "../mocks/mode";
import { server } from "../mocks/server";

const defaultRandom = mockConfig.random;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetDb();
  resetMockMode();
  mockConfig.slowMs = 2000;
  mockConfig.random = defaultRandom;
  window.history.replaceState(null, "", "/");
  configureApi({ getToken: () => "test-token", onUnauthorized: () => {} });
});

afterAll(() => server.close());

configureApi({ getToken: () => "test-token" });
