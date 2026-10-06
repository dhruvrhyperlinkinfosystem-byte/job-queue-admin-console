import type { Attempt, Job } from "../api/types";
import { ERROR_MESSAGES } from "./seed";
import { createRng, hashString, int, pick } from "./rng";

/** Attempt history is derived from the job, so it stays consistent with replays and retries. */
export function buildAttempts(job: Job): Attempt[] {
  const rng = createRng(hashString(job.id));
  const pool = ERROR_MESSAGES[job.queue] ?? ["Unknown error"];
  const created = Date.parse(job.created_at);
  const attempts: Attempt[] = [];
  let cursor = created + int(rng, 1, 60) * 1000;

  for (let number = 1; number <= job.attempts; number++) {
    const isLast = number === job.attempts;
    const duration = int(rng, 1, 45) * 1000;
    const startedAt = new Date(cursor).toISOString();
    cursor += duration + int(rng, 1, 20) * 60_000 * number;

    if (isLast && job.status === "running") {
      attempts.push({
        number,
        started_at: startedAt,
        finished_at: null,
        outcome: null,
        error: null,
      });
      continue;
    }

    const succeeded = isLast && job.status === "succeeded";
    attempts.push({
      number,
      started_at: startedAt,
      finished_at: new Date(Date.parse(startedAt) + duration).toISOString(),
      outcome: succeeded ? "succeeded" : "failed",
      error: succeeded ? null : isLast && job.last_error ? job.last_error : pick(rng, pool),
    });
  }
  return attempts.reverse();
}
