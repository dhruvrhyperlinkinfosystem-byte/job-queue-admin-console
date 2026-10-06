import {
  JOB_SORT_FIELDS,
  JOB_STATUSES,
  type JobListParams,
  type JobSortField,
  type JobStatus,
  type SortOrder,
} from "../../api/types";

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_SORT: JobSortField = "created_at";
const DEFAULT_ORDER: SortOrder = "desc";

/** Everything the jobs list shows is derived from this, and it round-trips through the URL. */
export interface JobListState {
  statuses: JobStatus[];
  queue: string;
  q: string;
  sort: JobSortField;
  order: SortOrder;
  page: number;
  pageSize: number;
}

const MANAGED_KEYS = ["status", "queue", "q", "sort", "order", "page", "page_size"];

function positiveInt(raw: string | null, fallback: number): number {
  return raw !== null && /^\d+$/.test(raw) && Number(raw) >= 1 ? Number(raw) : fallback;
}

export function parseListState(params: URLSearchParams): JobListState {
  const pageSize = positiveInt(params.get("page_size"), DEFAULT_PAGE_SIZE);
  return {
    statuses: JOB_STATUSES.filter((status) => params.getAll("status").includes(status)),
    queue: params.get("queue") ?? "",
    q: params.get("q") ?? "",
    sort: JOB_SORT_FIELDS.find((field) => field === params.get("sort")) ?? DEFAULT_SORT,
    order: params.get("order") === "asc" ? "asc" : DEFAULT_ORDER,
    page: positiveInt(params.get("page"), 1),
    pageSize: PAGE_SIZE_OPTIONS.some((size) => size === pageSize) ? pageSize : DEFAULT_PAGE_SIZE,
  };
}

/** Writes list state into a copy of `base`, leaving unrelated params (such as `mock`) alone. */
export function applyListState(base: URLSearchParams, state: JobListState): URLSearchParams {
  const next = new URLSearchParams(base);
  for (const key of MANAGED_KEYS) next.delete(key);
  // Canonical order keeps one URL per view, however the boxes were ticked.
  for (const status of JOB_STATUSES)
    if (state.statuses.includes(status)) next.append("status", status);
  if (state.queue) next.set("queue", state.queue);
  if (state.q) next.set("q", state.q);
  if (state.sort !== DEFAULT_SORT) next.set("sort", state.sort);
  if (state.order !== DEFAULT_ORDER) next.set("order", state.order);
  if (state.page > 1) next.set("page", String(state.page));
  if (state.pageSize !== DEFAULT_PAGE_SIZE) next.set("page_size", String(state.pageSize));
  return next;
}

export function toApiParams(state: JobListState): JobListParams {
  return {
    status: state.statuses.length > 0 ? state.statuses : undefined,
    queue: state.queue || undefined,
    q: state.q || undefined,
    sort: state.sort,
    order: state.order,
    page: state.page,
    page_size: state.pageSize,
  };
}

export function hasActiveFilters(state: JobListState): boolean {
  return state.statuses.length > 0 || state.queue !== "" || state.q !== "";
}
