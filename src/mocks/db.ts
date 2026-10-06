import type { Job, QueueSummary } from "../api/types";
import { QUEUE_NAMES, createSeedJobs } from "./seed";

const STORAGE_KEY = "mock-db-v1";

let jobs: Map<string, Job> | null = null;

function load(): Map<string, Job> {
  if (jobs) return jobs;
  let initial: Job[] | null = null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) initial = JSON.parse(raw) as Job[];
  } catch {
    initial = null;
  }
  jobs = new Map((initial ?? createSeedJobs()).map((job) => [job.id, job]));
  return jobs;
}

/** State lives in the page (MSW runs there), so mirror it to sessionStorage to survive reloads. */
function persist(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...load().values()]));
  } catch {
    /* storage unavailable: state lasts until the page is reloaded */
  }
}

export function resetDb(): void {
  jobs = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable: nothing to clear */
  }
}

export function allJobs(): Job[] {
  return [...load().values()];
}

export function findJob(id: string): Job | undefined {
  return load().get(id);
}

export function queueSummaries(): QueueSummary[] {
  const names: string[] = [...QUEUE_NAMES];
  for (const job of load().values()) if (!names.some((n) => n === job.queue)) names.push(job.queue);
  return names.map((name) => {
    const summary: QueueSummary = { name, pending: 0, running: 0, failed: 0, dead: 0 };
    for (const job of load().values()) {
      if (job.queue !== name) continue;
      if (job.status !== "succeeded") summary[job.status] += 1;
    }
    return summary;
  });
}

export type MutationResult =
  { ok: true; job: Job } | { ok: false; status: 404 | 409; code: string; message: string };

function transition(
  id: string,
  requiredStatus: "failed" | "dead",
  apply: (job: Job, now: string) => Job,
): MutationResult {
  const job = load().get(id);
  if (!job) return { ok: false, status: 404, code: "not_found", message: `Job ${id} not found` };
  if (job.status !== requiredStatus) {
    return {
      ok: false,
      status: 409,
      code: "invalid_state",
      message: `Job ${id} is ${job.status}; only ${requiredStatus} jobs can be ${
        requiredStatus === "failed" ? "retried" : "replayed"
      }`,
    };
  }
  const updated = apply(job, new Date().toISOString());
  load().set(id, updated);
  persist();
  return { ok: true, job: updated };
}

export function retryJob(id: string): MutationResult {
  return transition(id, "failed", (job, now) => ({
    ...job,
    status: "pending",
    next_attempt_at: now,
    updated_at: now,
  }));
}

export function replayJob(id: string): MutationResult {
  return transition(id, "dead", (job, now) => ({
    ...job,
    status: "pending",
    attempts: 0,
    last_error: null,
    next_attempt_at: now,
    updated_at: now,
  }));
}
