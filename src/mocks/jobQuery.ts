import {
  JOB_SORT_FIELDS,
  JOB_STATUSES,
  MAX_PAGE_SIZE,
  type Job,
  type JobListResponse,
  type JobSortField,
  type JobStatus,
  type SortOrder,
} from "../api/types";

export interface JobQuery {
  statuses: JobStatus[];
  queue: string | null;
  q: string;
  sort: JobSortField;
  order: SortOrder;
  page: number;
  pageSize: number;
}

export type ParsedJobQuery = { ok: true; query: JobQuery } | { ok: false; message: string };

const DEFAULT_PAGE_SIZE = 25;

function parsePositiveInt(raw: string | null, fallback: number): number | null {
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return value >= 1 ? value : null;
}

export function parseJobQuery(params: URLSearchParams): ParsedJobQuery {
  const statuses: JobStatus[] = [];
  for (const raw of params.getAll("status")) {
    const status = JOB_STATUSES.find((s) => s === raw);
    if (!status) return { ok: false, message: `Invalid status "${raw}"` };
    if (!statuses.includes(status)) statuses.push(status);
  }

  const sortRaw = params.get("sort") ?? "created_at";
  const sort = JOB_SORT_FIELDS.find((field) => field === sortRaw);
  if (!sort) return { ok: false, message: `Invalid sort "${sortRaw}"` };

  const orderRaw = params.get("order") ?? "desc";
  if (orderRaw !== "asc" && orderRaw !== "desc") {
    return { ok: false, message: `Invalid order "${orderRaw}"` };
  }

  const page = parsePositiveInt(params.get("page"), 1);
  if (page === null) return { ok: false, message: "page must be a positive integer" };

  const pageSize = parsePositiveInt(params.get("page_size"), DEFAULT_PAGE_SIZE);
  if (pageSize === null || pageSize > MAX_PAGE_SIZE) {
    return { ok: false, message: `page_size must be between 1 and ${MAX_PAGE_SIZE}` };
  }

  return {
    ok: true,
    query: {
      statuses,
      queue: params.get("queue") || null,
      q: params.get("q") ?? "",
      sort,
      order: orderRaw,
      page,
      pageSize,
    },
  };
}

function compare(a: Job, b: Job, sort: JobSortField): number {
  if (sort === "attempts") return a.attempts - b.attempts;
  return Date.parse(a[sort]) - Date.parse(b[sort]);
}

export function runJobQuery(jobs: readonly Job[], query: JobQuery): JobListResponse {
  const prefix = query.q.toLowerCase();
  const filtered = jobs.filter(
    (job) =>
      (query.statuses.length === 0 || query.statuses.includes(job.status)) &&
      (query.queue === null || job.queue === query.queue) &&
      (prefix === "" || job.id.toLowerCase().startsWith(prefix)),
  );

  const direction = query.order === "asc" ? 1 : -1;
  filtered.sort((a, b) => direction * compare(a, b, query.sort) || a.id.localeCompare(b.id));

  const start = (query.page - 1) * query.pageSize;
  return {
    items: filtered.slice(start, start + query.pageSize),
    page: query.page,
    page_size: query.pageSize,
    total: filtered.length,
  };
}
