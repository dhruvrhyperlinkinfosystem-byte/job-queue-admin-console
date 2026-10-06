import type { Job, JobStatus } from "../api/types";
import { createRng, int, pick } from "./rng";

export const SEED_COUNT = 250;
export const SEED_BASE_TIME = Date.parse("2026-09-28T12:00:00Z");
export const QUEUE_NAMES = ["email", "exports", "webhooks", "billing"] as const;

const STATUS_WEIGHTS: readonly [JobStatus, number][] = [
  ["succeeded", 40],
  ["pending", 20],
  ["failed", 17],
  ["dead", 13],
  ["running", 10],
];

export const ERROR_MESSAGES: Record<string, readonly string[]> = {
  email: [
    "SMTP 451: mailbox temporarily unavailable",
    "Template render failed: missing variable 'first_name'",
    "Recipient address rejected: user unknown",
  ],
  exports: [
    "Export timed out after 300s",
    "S3 PutObject failed: SlowDown",
    "Out of memory while building CSV",
  ],
  webhooks: [
    "Endpoint returned 502 Bad Gateway",
    "Connection refused: https://hooks.example.com/ingest",
    "TLS handshake failed: certificate has expired",
  ],
  billing: [
    "Payment provider returned 503",
    "Idempotency key conflict",
    "Invoice total mismatch: expected 4200, got 4199",
  ],
};

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function makeId(rng: () => number): string {
  let suffix = "";
  for (let i = 0; i < 12; i++) suffix += CROCKFORD[Math.floor(rng() * CROCKFORD.length)];
  return `job_01J${suffix}`;
}

function pickStatus(rng: () => number): JobStatus {
  const total = STATUS_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [status, weight] of STATUS_WEIGHTS) {
    roll -= weight;
    if (roll < 0) return status;
  }
  return "succeeded";
}

function makePayload(queue: string, rng: () => number): Record<string, unknown> {
  const n = int(rng, 1000, 9999);
  switch (queue) {
    case "email":
      return { to: `user${n}@example.com`, template: pick(rng, ["welcome", "receipt", "reset"]) };
    case "exports":
      return { report: pick(rng, ["orders", "users", "invoices"]), format: "csv", rows: n * 10 };
    case "webhooks":
      return { url: `https://hooks.example.com/ingest/${n}`, event: "order.updated", retries: 0 };
    default:
      return { customer_id: `cus_${n}`, amount_cents: n * 3, currency: "USD" };
  }
}

function minutes(count: number): number {
  return count * 60_000;
}

export function createSeedJobs(): Job[] {
  const rng = createRng(20260928);
  const jobs: Job[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < SEED_COUNT; i++) {
    let id = makeId(rng);
    while (seen.has(id)) id = makeId(rng);
    seen.add(id);

    // Cycle queues so each is guaranteed a share, then pick statuses at random.
    const queue = QUEUE_NAMES[i % QUEUE_NAMES.length]!;
    const status = pickStatus(rng);
    const maxAttempts = int(rng, 3, 5);

    let attempts: number;
    switch (status) {
      case "pending":
        attempts = int(rng, 0, 2);
        break;
      case "running":
      case "succeeded":
        attempts = int(rng, 1, 3);
        break;
      case "failed":
        attempts = int(rng, 1, maxAttempts - 1);
        break;
      case "dead":
        attempts = maxAttempts;
        break;
    }

    const createdMs = SEED_BASE_TIME - minutes(int(rng, 5, 14 * 24 * 60));
    const updatedMs = Math.min(
      SEED_BASE_TIME,
      createdMs + minutes(int(rng, 1, 3 * 24 * 60)) * Math.max(1, attempts),
    );
    const failing = status === "failed" || status === "dead";
    const hasPendingRetry = status === "failed" || (status === "pending" && attempts > 0);

    jobs.push({
      id,
      queue,
      status,
      attempts,
      max_attempts: maxAttempts,
      payload: makePayload(queue, rng),
      last_error:
        failing || (status === "pending" && attempts > 0)
          ? pick(rng, ERROR_MESSAGES[queue] ?? [])
          : null,
      next_attempt_at: hasPendingRetry
        ? new Date(SEED_BASE_TIME + minutes(int(rng, 1, 120))).toISOString()
        : null,
      created_at: new Date(createdMs).toISOString(),
      updated_at: new Date(updatedMs).toISOString(),
    });
  }
  return jobs;
}
