import { HttpResponse, http, type PathParams } from "msw";
import { API_BASE } from "../api/client";
import {
  MAX_BULK_REPLAY,
  type ApiErrorBody,
  type BulkReplayResponse,
  type QueueListResponse,
} from "../api/types";
import { buildAttempts } from "./attempts";
import { allJobs, findJob, queueSummaries, replayJob, retryJob, type MutationResult } from "./db";
import { parseJobQuery, runJobQuery } from "./jobQuery";
import { getMockMode, mockConfig } from "./mode";

const EXPIRED_TOKEN = "expired";
const FLAKY_500_RATE = 0.3;
const FLAKY_429_RATE = 0.05;

function errorResponse(status: number, code: string, message: string, headers?: HeadersInit) {
  const body: ApiErrorBody = { error: { code, message } };
  return HttpResponse.json(body, { status, headers });
}

const serverError = () => errorResponse(500, "internal_error", "Internal server error");

const rateLimited = () =>
  errorResponse(429, "rate_limited", "Too many requests", {
    "Retry-After": String(mockConfig.retryAfterSeconds),
  });

function bearerToken(request: Request): string | null {
  const match = /^Bearer\s+(.+)$/.exec(request.headers.get("Authorization") ?? "");
  return match?.[1]?.trim() || null;
}

/** Latency, auth and failure injection shared by every endpoint. Returns a response to short-circuit. */
async function intercept(request: Request): Promise<Response | null> {
  const mode = getMockMode();
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, mockConfig.slowMs));

  const token = bearerToken(request);
  if (token === null || token === EXPIRED_TOKEN) {
    return errorResponse(401, "unauthorized", "Missing or invalid token");
  }

  if (mode === "errors") return serverError();
  if (mode === "flaky") {
    const roll = mockConfig.random();
    if (roll < FLAKY_500_RATE) return serverError();
    if (roll < FLAKY_500_RATE + FLAKY_429_RATE) return rateLimited();
  }
  return null;
}

interface Context {
  request: Request;
  params: PathParams;
}

function route(resolver: (ctx: Context) => Response | Promise<Response>) {
  return async (ctx: Context) => (await intercept(ctx.request)) ?? resolver(ctx);
}

const idOf = (params: PathParams) => String(params.id);

function mutationResponse(result: MutationResult) {
  return result.ok
    ? HttpResponse.json(result.job, { status: 202 })
    : errorResponse(result.status, result.code, result.message);
}

function parseBulkIds(body: unknown): string[] | null {
  if (typeof body !== "object" || body === null || !("ids" in body)) return null;
  const { ids } = body;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_BULK_REPLAY) return null;
  return ids.every((id): id is string => typeof id === "string") ? ids : null;
}

export const handlers = [
  http.get(
    `${API_BASE}/queues`,
    route(() => HttpResponse.json<QueueListResponse>({ items: queueSummaries() })),
  ),

  http.get(
    `${API_BASE}/jobs`,
    route(({ request }) => {
      const parsed = parseJobQuery(new URL(request.url).searchParams);
      if (!parsed.ok) return errorResponse(400, "validation_error", parsed.message);
      return HttpResponse.json(runJobQuery(allJobs(), parsed.query));
    }),
  ),

  http.get(
    `${API_BASE}/jobs/:id`,
    route(({ params }) => {
      const job = findJob(idOf(params));
      return job
        ? HttpResponse.json(job)
        : errorResponse(404, "not_found", `Job ${idOf(params)} not found`);
    }),
  ),

  http.get(
    `${API_BASE}/jobs/:id/attempts`,
    route(({ params }) => {
      const job = findJob(idOf(params));
      if (!job) return errorResponse(404, "not_found", `Job ${idOf(params)} not found`);
      return HttpResponse.json({ items: buildAttempts(job) });
    }),
  ),

  http.post(
    `${API_BASE}/jobs/:id/retry`,
    route(({ params }) => mutationResponse(retryJob(idOf(params)))),
  ),

  http.post(
    `${API_BASE}/deadletter/replay`,
    route(async ({ request }) => {
      const body: unknown = await request.json().catch(() => undefined);
      const ids = parseBulkIds(body);
      if (!ids) {
        return errorResponse(
          400,
          "validation_error",
          `Body must be { "ids": string[] } with 1 to ${MAX_BULK_REPLAY} ids`,
        );
      }
      const result: BulkReplayResponse = { replayed: [], failed: [] };
      for (const id of new Set(ids)) {
        const outcome = replayJob(id);
        if (outcome.ok) result.replayed.push(id);
        else result.failed.push({ id, error: { code: outcome.code, message: outcome.message } });
      }
      return HttpResponse.json(result);
    }),
  ),

  http.post(
    `${API_BASE}/deadletter/:id/replay`,
    route(({ params }) => mutationResponse(replayJob(idOf(params)))),
  ),
];
