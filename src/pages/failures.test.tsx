import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { useAuthStore } from "../stores/authStore";
import { errorBody, renderAt } from "../test/utils";

describe("server errors", () => {
  it("shows the message with a retry control, and recovers", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(
        "/api/v1/jobs",
        () =>
          HttpResponse.json(errorBody("internal_error", "Database is on fire"), { status: 500 }),
        { once: true },
      ),
    );
    renderAt("/jobs");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("Database is on fire");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Showing 1–25 of 250 jobs")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("handles every call failing in errors mode", async () => {
    renderAt("/?mock=errors");
    expect(await screen.findByRole("alert")).toHaveTextContent("Internal server error");
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });

  it("explains a network failure", async () => {
    server.use(http.get("/api/v1/queues", () => HttpResponse.error(), { once: true }));
    renderAt("/");
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach the server/i);
  });

  it("shows an empty state when there are no queues", async () => {
    server.use(http.get("/api/v1/queues", () => HttpResponse.json({ items: [] })));
    renderAt("/");
    expect(await screen.findByRole("heading", { name: "No queues yet" })).toBeInTheDocument();
  });
});

describe("401 handling", () => {
  it("clears the token and returns to sign-in with a message", async () => {
    useAuthStore.setState({ token: "expired" });
    renderAt("/jobs?status=dead");

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
    expect(screen.getByLabelText("Access token")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/signin");
    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });

  it("returns to the page the user was on after signing in again", async () => {
    const user = userEvent.setup();
    useAuthStore.setState({ token: "expired" });
    renderAt("/jobs?status=dead");
    await user.type(await screen.findByLabelText("Access token"), "fresh-token");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(/Showing 1–/)).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe("/jobs?status=dead");
    expect(screen.getByRole("checkbox", { name: "Dead" })).toBeChecked();
  });

  it("signs out when a mutation gets a 401", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?status=failed");
    await screen.findByText(/Showing 1–/);
    server.use(
      http.post("/api/v1/jobs/:id/retry", () =>
        HttpResponse.json(errorBody("unauthorized", "Missing or invalid token"), { status: 401 }),
      ),
    );
    await user.click(screen.getAllByRole("button", { name: /^Retry / })[0]!);
    expect(await screen.findByLabelText("Access token")).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
  });
});

describe("429 handling", () => {
  it("waits for Retry-After before retrying automatically", async () => {
    let calls = 0;
    server.use(
      http.get("/api/v1/queues", () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json(errorBody("rate_limited", "Too many requests"), {
            status: 429,
            headers: { "Retry-After": "1" },
          });
        }
      }),
    );
    renderAt("/");

    expect(await screen.findByRole("alert")).toHaveTextContent(/retrying automatically in/i);
    expect(screen.getByRole("button", { name: "Retry now" })).toBeInTheDocument();
    expect(calls).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(calls).toBe(1); // still waiting

    expect(
      await screen.findByRole("heading", { name: "email" }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(calls).toBe(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lets the user retry immediately instead of waiting", async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.get("/api/v1/queues", () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json(errorBody("rate_limited", "Too many requests"), {
            status: 429,
            headers: { "Retry-After": "30" },
          });
        }
      }),
    );
    renderAt("/");
    await screen.findByRole("button", { name: "Retry now" });
    await user.click(screen.getByRole("button", { name: "Retry now" }));
    expect(await screen.findByRole("heading", { name: "email" })).toBeInTheDocument();
  });

  it("gives up automatic retries after three rate limits in a row", async () => {
    let calls = 0;
    server.use(
      http.get("/api/v1/queues", () => {
        calls += 1;
        return HttpResponse.json(errorBody("rate_limited", "Too many requests"), {
          status: 429,
          headers: { "Retry-After": "0" },
        });
      }),
    );
    renderAt("/");
    await waitFor(() => expect(calls).toBe(4), { timeout: 3000 });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/retrying automatically/i)).not.toBeInTheDocument();
  });
});
