import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { api } from "../api/endpoints";
import { server } from "../mocks/server";
import { errorBody, failOnce, renderAt, rowIds } from "../test/utils";

describe("row actions", () => {
  it("retries a failed job and shows the confirmed result", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?status=failed");
    await screen.findByText(/Showing 1–/);
    const [id] = rowIds();

    await user.click(screen.getByRole("button", { name: `Retry ${id}` }));

    expect(await screen.findByText(`Job ${id} is pending again.`)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("link", { name: id })).not.toBeInTheDocument());
  });

  it("replays a dead job", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?status=dead");
    await screen.findByText(/Showing 1–/);
    const [id] = rowIds();
    await user.click(screen.getByRole("button", { name: `Replay ${id}` }));
    expect(await screen.findByText(`Job ${id} is pending again.`)).toBeInTheDocument();
    expect((await api.getJob(id!)).status).toBe("pending");
  });

  it("offers no action for jobs that are not failed or dead", async () => {
    renderAt("/jobs?status=succeeded");
    await screen.findByText(/Showing 1–/);
    expect(screen.queryByRole("button", { name: /^(Retry|Replay) / })).not.toBeInTheDocument();
  });

  it("explains a 409 clearly and refreshes the list", async () => {
    const user = userEvent.setup();
    let listCalls = 0;
    server.use(
      http.get("/api/v1/jobs", () => {
        listCalls += 1;
      }),
    );
    renderAt("/jobs?status=failed");
    await screen.findByText(/Showing 1–/);
    const [id] = rowIds();
    const callsBefore = listCalls;

    server.use(
      http.post("/api/v1/jobs/:id/retry", () =>
        HttpResponse.json(
          errorBody("invalid_state", `Job ${id} is dead; only failed jobs can be retried`),
          { status: 409 },
        ),
      ),
    );
    await user.click(screen.getByRole("button", { name: `Retry ${id}` }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(`Job ${id} is dead; only failed jobs can be retried`);
    expect(alert).toHaveTextContent(/refreshed/i);
    await waitFor(() => expect(listCalls).toBeGreaterThan(callsBefore));
  });

  it("tells the user how long to wait after a 429", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?status=failed");
    await screen.findByText(/Showing 1–/);
    const [id] = rowIds();
    failOnce("post", "/api/v1/jobs/:id/retry", 429, { "Retry-After": "3" });
    await user.click(screen.getByRole("button", { name: `Retry ${id}` }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Try again in 3s");
    expect(screen.getByRole("button", { name: `Retry ${id}` })).toBeEnabled();
  });
});

describe("bulk replay", () => {
  async function selectTwoDead(user: ReturnType<typeof userEvent.setup>) {
    renderAt("/jobs?status=dead");
    await screen.findByText(/Showing 1–/);
    const ids = rowIds().slice(0, 2);
    for (const id of ids) await user.click(screen.getByRole("checkbox", { name: `Select ${id}` }));
    return ids as [string, string];
  }

  it("only offers checkboxes for dead jobs", async () => {
    renderAt("/jobs");
    await screen.findByText(/Showing 1–/);
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    for (const row of rows) {
      const isDead = within(row).queryByText("Dead") !== null;
      expect(within(row).queryByRole("checkbox") !== null).toBe(isDead);
    }
  });

  it("asks for confirmation and states the count", async () => {
    const user = userEvent.setup();
    await selectTwoDead(user);
    expect(screen.getByRole("region", { name: /bulk actions/i })).toHaveTextContent("2 selected");

    await user.click(screen.getByRole("button", { name: "Replay 2 dead jobs" }));
    const dialog = screen.getByRole("dialog", { name: "Replay 2 dead jobs?" });
    expect(dialog).toHaveAttribute("aria-modal", "true");

    await user.click(within(dialog).getByRole("button", { name: "Replay 2" }));
    expect(await within(dialog).findByText(/Replayed 2 of 2/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("list")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Replayed 2 jobs.")).toBeInTheDocument();
  });

  it("reports a partial failure per job, not as one generic error", async () => {
    const user = userEvent.setup();
    const [ok, stale] = await selectTwoDead(user);
    // Someone else replays one of the selected jobs first.
    await api.replayJob(stale);

    await user.click(screen.getByRole("button", { name: "Replay 2 dead jobs" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Replay 2" }));

    expect(await within(dialog).findByText(/Replayed 1 of 2/)).toBeInTheDocument();
    const failures = within(dialog).getAllByRole("listitem");
    expect(failures).toHaveLength(1);
    expect(failures[0]).toHaveTextContent(stale);
    expect(failures[0]).toHaveTextContent(/only dead jobs can be replayed/i);
    expect(dialog).not.toHaveTextContent(ok);
    expect(await screen.findByText(/Replayed 1, 1 failed/)).toBeInTheDocument();
  });

  it("shows a request-level failure inside the dialog and lets the user retry", async () => {
    const user = userEvent.setup();
    await selectTwoDead(user);
    failOnce("post", "/api/v1/deadletter/replay", 500);
    await user.click(screen.getByRole("button", { name: "Replay 2 dead jobs" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Replay 2" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Injected 500");

    await user.click(within(dialog).getByRole("button", { name: "Try again" }));
    expect(await within(dialog).findByText(/Replayed 2 of 2/)).toBeInTheDocument();
  });

  it("selects every dead job on the page from the header checkbox", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?status=dead&page_size=10");
    await screen.findByText(/Showing 1–/);
    const count = rowIds().length;
    await user.click(screen.getByRole("checkbox", { name: /select all dead jobs/i }));
    expect(screen.getByRole("region", { name: /bulk actions/i })).toHaveTextContent(
      `${count} selected`,
    );
    await user.click(screen.getByRole("checkbox", { name: /select all dead jobs/i }));
    expect(screen.queryByRole("region", { name: /bulk actions/i })).not.toBeInTheDocument();
  });

  it("clears the selection when the view changes", async () => {
    const user = userEvent.setup();
    await selectTwoDead(user);
    await user.click(screen.getByRole("checkbox", { name: "Failed" }));
    await screen.findByText(/Showing 1–/);
    expect(screen.queryByRole("region", { name: /bulk actions/i })).not.toBeInTheDocument();
  });

  it("traps focus, closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    await selectTwoDead(user);
    const trigger = screen.getByRole("button", { name: "Replay 2 dead jobs" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog");
    const cancel = within(dialog).getByRole("button", { name: "Cancel" });
    const confirm = within(dialog).getByRole("button", { name: "Replay 2" });
    expect(cancel).toHaveFocus();
    await user.tab();
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(cancel).toHaveFocus();
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
