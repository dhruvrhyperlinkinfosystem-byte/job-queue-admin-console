import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";
import { errorBody, failOnce, renderAt, seedWhere } from "../test/utils";

const dead = () => seedWhere((j) => j.status === "dead")[0]!;
const failed = () => seedWhere((j) => j.status === "failed")[0]!;

describe("job detail", () => {
  it("shows status, counts, timestamps, last error, attempts and payload", async () => {
    const job = dead();
    renderAt(`/jobs/${job.id}`);

    expect(await screen.findByRole("heading", { level: 1, name: job.id })).toBeInTheDocument();
    expect(screen.getByText("Dead")).toBeInTheDocument();
    expect(screen.getByText(job.queue)).toBeInTheDocument();
    expect(screen.getByText(`${job.attempts} of ${job.max_attempts}`)).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("Next attempt")).toBeInTheDocument();

    const lastError = screen.getByRole("region", { name: "Last error" });
    expect(lastError).toHaveTextContent(job.last_error!);

    const attempts = await screen.findByRole("table", { name: /attempts/i });
    const rows = within(attempts).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(job.attempts);
    expect(rows[0]).toHaveTextContent(`#${job.attempts}`); // newest first
    expect(rows.at(-1)).toHaveTextContent("#1");

    const payload = screen.getByRole("heading", { name: "Payload" }).closest("section")!;
    expect(within(payload).getByText(/"template"|"report"|"url"|"customer_id"/)).toBeVisible();
  });

  it("copies the formatted payload", async () => {
    const user = userEvent.setup();
    const job = dead();
    renderAt(`/jobs/${job.id}`);
    await screen.findByRole("heading", { level: 1, name: job.id });

    await user.click(screen.getByRole("button", { name: "Copy payload" }));

    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
    await expect(navigator.clipboard.readText()).resolves.toBe(
      JSON.stringify(job.payload, null, 2),
    );
  });

  it("shows a not-found state for an unknown id", async () => {
    renderAt("/jobs/job_does_not_exist");
    expect(await screen.findByRole("heading", { name: "Job not found" })).toBeInTheDocument();
    expect(screen.getByText(/job_does_not_exist/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to jobs/i })).toHaveAttribute("href", "/jobs");
  });

  it("links back to the list view the user came from", async () => {
    const user = userEvent.setup();
    renderAt("/jobs?status=dead&queue=email");
    const link = await screen.findAllByRole("link", { name: /^job_/ });
    await user.click(link[0]!);
    const back = await screen.findByRole("link", { name: /back to jobs/i });
    expect(back).toHaveAttribute("href", "/jobs?status=dead&queue=email");
  });

  it("replays a dead job and shows the new status", async () => {
    const user = userEvent.setup();
    const job = dead();
    renderAt(`/jobs/${job.id}`);
    await screen.findByRole("heading", { level: 1, name: job.id });

    await user.click(screen.getByRole("button", { name: `Replay ${job.id}` }));

    await waitFor(() => expect(screen.getByText("Pending")).toBeInTheDocument());
    expect(screen.getByText(`0 of ${job.max_attempts}`)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Replay / })).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /no attempts yet/i })).toBeInTheDocument();
  });

  it("retries a failed job", async () => {
    const user = userEvent.setup();
    const job = failed();
    renderAt(`/jobs/${job.id}`);
    await screen.findByRole("heading", { level: 1, name: job.id });
    await user.click(screen.getByRole("button", { name: `Retry ${job.id}` }));
    await waitFor(() => expect(screen.getByText("Pending")).toBeInTheDocument());
  });

  it("refreshes the job when the action is no longer valid (409)", async () => {
    const user = userEvent.setup();
    const job = dead();
    renderAt(`/jobs/${job.id}`);
    await screen.findByRole("heading", { level: 1, name: job.id });

    // The job is replayed elsewhere; our page still thinks it is dead.
    await fetch(`${window.location.origin}/api/v1/deadletter/${job.id}/replay`, {
      method: "POST",
      headers: { Authorization: "Bearer test-token" },
    });
    await user.click(screen.getByRole("button", { name: `Replay ${job.id}` }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/only dead jobs can be replayed/i);
    await waitFor(() => expect(screen.getByText("Pending")).toBeInTheDocument());
  });

  it("shows an error with a retry control when the job cannot be loaded", async () => {
    const user = userEvent.setup();
    const job = dead();
    failOnce("get", "/api/v1/jobs/:id", 500);
    renderAt(`/jobs/${job.id}`);
    expect(await screen.findByRole("alert")).toHaveTextContent("Injected 500");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: job.id })).toBeInTheDocument();
  });

  it("keeps the job visible when only the attempts fail to load", async () => {
    const job = dead();
    server.use(
      http.get("/api/v1/jobs/:id/attempts", () =>
        HttpResponse.json(errorBody("internal_error", "Attempts are down"), { status: 500 }),
      ),
    );
    renderAt(`/jobs/${job.id}`);
    expect(await screen.findByRole("heading", { level: 1, name: job.id })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Attempts are down");
    expect(screen.getByRole("heading", { name: "Payload" })).toBeInTheDocument();
  });
});

describe("copy payload fallback", () => {
  it("still copies when the async Clipboard API is unavailable", async () => {
    const user = userEvent.setup();
    const job = dead();
    renderAt(`/jobs/${job.id}`);
    await screen.findByRole("heading", { level: 1, name: job.id });

    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    let copied = "";
    document.execCommand = (command: string) => {
      copied = (document.querySelector("textarea") as HTMLTextAreaElement).value;
      return command === "copy";
    };

    await user.click(screen.getByRole("button", { name: "Copy payload" }));
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
    expect(copied).toBe(JSON.stringify(job.payload, null, 2));
  });

  it("says so when copying is impossible", async () => {
    const user = userEvent.setup();
    const job = dead();
    renderAt(`/jobs/${job.id}`);
    await screen.findByRole("heading", { level: 1, name: job.id });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    document.execCommand = () => false;

    await user.click(screen.getByRole("button", { name: "Copy payload" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not copy/i);
  });
});
