import { request } from "./client";
import type {
  AttemptListResponse,
  BulkReplayResponse,
  Job,
  JobListParams,
  JobListResponse,
  QueueListResponse,
} from "./types";

const jobPath = (id: string) => `/jobs/${encodeURIComponent(id)}`;

export const api = {
  listQueues: (signal?: AbortSignal) => request<QueueListResponse>("/queues", { signal }),

  listJobs: (params: JobListParams, signal?: AbortSignal) =>
    request<JobListResponse>("/jobs", { query: { ...params }, signal }),

  getJob: (id: string, signal?: AbortSignal) => request<Job>(jobPath(id), { signal }),

  listAttempts: (id: string, signal?: AbortSignal) =>
    request<AttemptListResponse>(`${jobPath(id)}/attempts`, { signal }),

  retryJob: (id: string) => request<Job>(`${jobPath(id)}/retry`, { method: "POST" }),

  replayJob: (id: string) =>
    request<Job>(`/deadletter/${encodeURIComponent(id)}/replay`, { method: "POST" }),

  replayJobs: (ids: string[]) =>
    request<BulkReplayResponse>("/deadletter/replay", { method: "POST", body: { ids } }),
};
