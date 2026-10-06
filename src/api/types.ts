export type JobStatus = "pending" | "running" | "succeeded" | "failed" | "dead";

export const JOB_STATUSES: readonly JobStatus[] = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "dead",
];

export interface Job {
  id: string;
  queue: string;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  payload: Record<string, unknown>;
  last_error: string | null;
  next_attempt_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attempt {
  number: number;
  started_at: string;
  finished_at: string | null;
  outcome: "succeeded" | "failed" | null;
  error: string | null;
}

export interface QueueSummary {
  name: string;
  pending: number;
  running: number;
  failed: number;
  dead: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export type JobSortField = "created_at" | "updated_at" | "attempts";
export type SortOrder = "asc" | "desc";

export const JOB_SORT_FIELDS: readonly JobSortField[] = ["created_at", "updated_at", "attempts"];
export const MAX_PAGE_SIZE = 100;
export const MAX_BULK_REPLAY = 50;

export interface JobListParams {
  status?: JobStatus[];
  queue?: string;
  q?: string;
  sort?: JobSortField;
  order?: SortOrder;
  page?: number;
  page_size?: number;
}

export interface QueueListResponse {
  items: QueueSummary[];
}

export interface JobListResponse {
  items: Job[];
  page: number;
  page_size: number;
  total: number;
}

export interface AttemptListResponse {
  items: Attempt[];
}

export interface BulkReplayResponse {
  replayed: string[];
  failed: { id: string; error: ApiErrorBody["error"] }[];
}
