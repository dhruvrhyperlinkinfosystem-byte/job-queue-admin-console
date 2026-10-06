import { api } from "./endpoints";
import { configureApi } from "./client";
import { ApiError } from "./errors";
import type { Job, JobStatus } from "./types";

async function firstJobWith(status: JobStatus): Promise<Job> {
  const { items } = await api.listJobs({ status: [status], page_size: 1 });
  const job = items[0];
  if (!job) throw new Error(`no ${status} job in seed`);
  return job;
}

async function apiError(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe("queues", () => {
  it("summarises the four queues", async () => {
    const { items } = await api.listQueues();
    expect(items.map((q) => q.name)).toEqual(["email", "exports", "webhooks", "billing"]);
    expect(items.every((q) => q.pending + q.running + q.failed + q.dead > 0)).toBe(true);
  });
});

describe("job list", () => {
  it("paginates with defaults and reports the total", async () => {
    const first = await api.listJobs({});
    expect(first).toMatchObject({ page: 1, page_size: 25, total: 250 });
    expect(first.items).toHaveLength(25);
    const last = await api.listJobs({ page: 10 });
    expect(last.items).toHaveLength(25);
    const beyond = await api.listJobs({ page: 11 });
    expect(beyond.items).toHaveLength(0);
  });

  it("filters by repeatable status and by queue", async () => {
    const res = await api.listJobs({ status: ["failed", "dead"], queue: "email", page_size: 100 });
    expect(res.items.length).toBeGreaterThan(0);
    expect(res.items.every((j) => j.queue === "email")).toBe(true);
    expect(res.items.every((j) => j.status === "failed" || j.status === "dead")).toBe(true);
  });

  it("searches by id prefix", async () => {
    const target = await firstJobWith("dead");
    const res = await api.listJobs({ q: target.id.slice(0, 12) });
    expect(res.items.map((j) => j.id)).toContain(target.id);
    expect(res.items.every((j) => j.id.startsWith(target.id.slice(0, 12)))).toBe(true);
  });

  it("sorts by attempts in both directions", async () => {
    const asc = await api.listJobs({ sort: "attempts", order: "asc", page_size: 100 });
    const desc = await api.listJobs({ sort: "attempts", order: "desc", page_size: 100 });
    const counts = (items: Job[]) => items.map((j) => j.attempts);
    expect(counts(asc.items)).toEqual([...counts(asc.items)].sort((a, b) => a - b));
    expect(counts(desc.items)).toEqual([...counts(desc.items)].sort((a, b) => b - a));
  });

  it.each([
    { page: 0 },
    { page_size: 101 },
    { page_size: 0 },
    { sort: "id" as never },
    { status: ["bogus" as JobStatus] },
  ])("rejects invalid params %j with 400", async (params) => {
    const error = await apiError(api.listJobs(params));
    expect(error).toMatchObject({ status: 400, code: "validation_error" });
  });
});

describe("job detail", () => {
  it("returns a job and its attempts newest first", async () => {
    const dead = await firstJobWith("dead");
    expect(await api.getJob(dead.id)).toEqual(dead);
    const { items } = await api.listAttempts(dead.id);
    expect(items).toHaveLength(dead.attempts);
    expect(items.map((a) => a.number)).toEqual(
      [...items.map((a) => a.number)].sort((a, b) => b - a),
    );
    expect(items[0]?.error).toBe(dead.last_error);
  });

  it("returns 404 for unknown ids", async () => {
    expect(await apiError(api.getJob("job_nope"))).toMatchObject({
      status: 404,
      code: "not_found",
    });
    expect(await apiError(api.listAttempts("job_nope"))).toMatchObject({ status: 404 });
  });
});

describe("actions", () => {
  it("retries a failed job and the change persists", async () => {
    const failed = await firstJobWith("failed");
    const retried = await api.retryJob(failed.id);
    expect(retried.status).toBe("pending");
    expect((await api.getJob(failed.id)).status).toBe("pending");
  });

  it("replays a dead job, resetting attempts", async () => {
    const dead = await firstJobWith("dead");
    const replayed = await api.replayJob(dead.id);
    expect(replayed).toMatchObject({ status: "pending", attempts: 0 });
  });

  it("returns 409 for actions invalid in the current status", async () => {
    const dead = await firstJobWith("dead");
    const failed = await firstJobWith("failed");
    expect(await apiError(api.retryJob(dead.id))).toMatchObject({ status: 409 });
    expect(await apiError(api.replayJob(failed.id))).toMatchObject({ status: 409 });
    await api.replayJob(dead.id);
    expect(await apiError(api.replayJob(dead.id))).toMatchObject({ status: 409 });
  });

  it("returns 404 when acting on an unknown job", async () => {
    expect(await apiError(api.retryJob("job_nope"))).toMatchObject({ status: 404 });
  });

  it("bulk replays with partial failure reported per job", async () => {
    const { items } = await api.listJobs({ status: ["dead"], page_size: 3 });
    const failed = await firstJobWith("failed");
    const ids = [items[0]!.id, items[1]!.id, failed.id, "job_nope"];
    const result = await api.replayJobs(ids);
    expect(result.replayed).toEqual([items[0]!.id, items[1]!.id]);
    expect(result.failed).toEqual([
      { id: failed.id, error: expect.objectContaining({ code: "invalid_state" }) },
      { id: "job_nope", error: expect.objectContaining({ code: "not_found" }) },
    ]);
  });

  it("validates the bulk replay body", async () => {
    expect(await apiError(api.replayJobs([]))).toMatchObject({ status: 400 });
    const tooMany = Array.from({ length: 51 }, (_, i) => `job_${i}`);
    expect(await apiError(api.replayJobs(tooMany))).toMatchObject({ status: 400 });
  });
});

describe("auth", () => {
  it("returns 401 without a token and calls onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    configureApi({ getToken: () => null, onUnauthorized });
    expect(await apiError(api.listQueues())).toMatchObject({ status: 401, code: "unauthorized" });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("returns 401 for the literal expired token on every call", async () => {
    configureApi({ getToken: () => "expired" });
    expect(await apiError(api.listQueues())).toMatchObject({ status: 401 });
    expect(await apiError(api.listJobs({}))).toMatchObject({ status: 401 });
    expect(await apiError(api.getJob("job_x"))).toMatchObject({ status: 401 });
  });
});

describe("mock modes", () => {
  const setMode = (mode: string) => window.history.replaceState(null, "", `/?mock=${mode}`);

  it("errors mode returns 500 for every call", async () => {
    setMode("errors");
    expect(await apiError(api.listQueues())).toMatchObject({ status: 500, code: "internal_error" });
    expect(await apiError(api.retryJob("job_x"))).toMatchObject({ status: 500 });
  });

  it("errors mode still returns 401 for the expired token", async () => {
    setMode("errors");
    configureApi({ getToken: () => "expired" });
    expect(await apiError(api.listQueues())).toMatchObject({ status: 401 });
  });

  it("slow mode delays every call", async () => {
    setMode("slow");
    const { mockConfig } = await import("../mocks/mode");
    mockConfig.slowMs = 150;
    const started = performance.now();
    await api.listQueues();
    expect(performance.now() - started).toBeGreaterThanOrEqual(140);
  });

  it("flaky mode maps the random roll to 500 (30%), 429 (5%) or success", async () => {
    setMode("flaky");
    const { mockConfig } = await import("../mocks/mode");
    mockConfig.random = () => 0.1;
    expect(await apiError(api.listQueues())).toMatchObject({ status: 500 });
    mockConfig.random = () => 0.32;
    expect(await apiError(api.listQueues())).toMatchObject({ status: 429, retryAfterSeconds: 2 });
    mockConfig.random = () => 0.5;
    expect((await api.listQueues()).items).toHaveLength(4);
  });

  it("keeps the mode after the query string is dropped, until ?mock=normal", async () => {
    setMode("errors");
    await apiError(api.listQueues());
    window.history.replaceState(null, "", "/jobs");
    expect(await apiError(api.listQueues())).toMatchObject({ status: 500 });
    setMode("normal");
    expect((await api.listQueues()).items).toHaveLength(4);
  });
});

describe("client", () => {
  it("turns network failures into ApiError with status 0", async () => {
    const { server } = await import("../mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(http.get("/api/v1/queues", () => HttpResponse.error()));
    const error = await apiError(api.listQueues());
    expect(error).toMatchObject({ status: 0, code: "network_error" });
    expect(error.isNetworkError).toBe(true);
  });

  it("falls back to a generic error for non-JSON failures", async () => {
    const { server } = await import("../mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(http.get("/api/v1/queues", () => new HttpResponse("oops", { status: 502 })));
    expect(await apiError(api.listQueues())).toMatchObject({ status: 502, code: "http_error" });
  });
});
