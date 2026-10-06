import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/endpoints";
import { JOB_STATUSES, type JobStatus } from "../../api/types";
import { Button, focusRing } from "../../components/Button";
import { useApiQuery } from "../../hooks/useApiQuery";
import { cn } from "../../lib/cn";
import { STATUS_LABELS } from "../../lib/status";
import { hasActiveFilters, type JobListState } from "./listParams";

const SEARCH_DEBOUNCE_MS = 300;
const fieldClass = cn(
  "min-h-10 rounded-md border border-slate-400 bg-white px-3 text-sm dark:border-slate-500 dark:bg-slate-900",
  focusRing,
);

interface JobsFiltersProps {
  state: JobListState;
  onChange: (patch: Partial<JobListState>, options?: { replace?: boolean }) => void;
  onClear: () => void;
}

function SearchField({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);
  const [seenValue, setSeenValue] = useState(value);

  // Follow the URL when it changes underneath us (back/forward, "Clear filters").
  if (value !== seenValue) {
    setSeenValue(value);
    setText(value);
  }

  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => onCommit(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, value, onCommit]);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="job-search" className="text-sm font-medium">
        Search by ID prefix
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
        <input
          id="job-search"
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="job_01J…"
          autoComplete="off"
          className={cn(fieldClass, "w-full pl-9 sm:w-64")}
        />
      </div>
    </div>
  );
}

export function JobsFilters({ state, onChange, onClear }: JobsFiltersProps) {
  const queues = useApiQuery((signal) => api.listQueues(signal), "queues");
  const queueNames = queues.data?.items.map((queue) => queue.name) ?? [];
  if (state.queue && !queueNames.includes(state.queue)) queueNames.push(state.queue);

  function toggleStatus(status: JobStatus) {
    const statuses = state.statuses.includes(status)
      ? state.statuses.filter((s) => s !== status)
      : [...state.statuses, status];
    onChange({ statuses });
  }

  return (
    <section aria-label="Filters" className="flex flex-wrap items-end gap-x-6 gap-y-4">
      <SearchField value={state.q} onCommit={(q) => onChange({ q }, { replace: true })} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="job-queue" className="text-sm font-medium">
          Queue
        </label>
        <select
          id="job-queue"
          value={state.queue}
          onChange={(event) => onChange({ queue: event.target.value })}
          className={fieldClass}
        >
          <option value="">All queues</option>
          {queueNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Status</legend>
        <div className="flex flex-wrap gap-2">
          {JOB_STATUSES.map((status) => {
            const checked = state.statuses.includes(status);
            return (
              <label
                key={status}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-indigo-600 dark:has-[:focus-visible]:outline-indigo-300",
                  checked
                    ? "border-indigo-700 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950"
                    : "border-slate-300 dark:border-slate-600",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStatus(status)}
                  className="size-4 accent-indigo-700"
                />
                {STATUS_LABELS[status]}
              </label>
            );
          })}
        </div>
      </fieldset>

      {hasActiveFilters(state) && (
        <Button variant="ghost" onClick={onClear}>
          <X className="size-4" aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </section>
  );
}
