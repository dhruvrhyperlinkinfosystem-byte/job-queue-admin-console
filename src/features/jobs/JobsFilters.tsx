import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../api/endpoints";
import { JOB_STATUSES, type JobStatus } from "../../api/types";
import { Button } from "../../components/Button";
import { useApiQuery } from "../../hooks/useApiQuery";
import { cn } from "../../lib/cn";
import { STATUS_LABELS } from "../../lib/status";
import { STATUS_STYLES } from "../../lib/statusStyles";
import { hasActiveFilters, type JobListState } from "./listParams";

const SEARCH_DEBOUNCE_MS = 300;

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
          className="field w-full pl-9 sm:w-72"
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
    <section aria-label="Filters" className="card flex flex-wrap items-end gap-x-6 gap-y-4 p-4">
      <SearchField value={state.q} onCommit={(q) => onChange({ q }, { replace: true })} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="job-queue" className="text-sm font-medium">
          Queue
        </label>
        <select
          id="job-queue"
          value={state.queue}
          onChange={(event) => onChange({ queue: event.target.value })}
          className="field pr-8"
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
            const { icon: Icon } = STATUS_STYLES[status];
            return (
              <label
                key={status}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-indigo-600 dark:has-[:focus-visible]:outline-indigo-300",
                  checked
                    ? "border-indigo-600 bg-indigo-50 text-indigo-900 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-100"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleStatus(status)}
                  className="size-4 accent-indigo-600"
                />
                <Icon className="size-3.5" aria-hidden="true" />
                {STATUS_LABELS[status]}
              </label>
            );
          })}
        </div>
      </fieldset>

      {hasActiveFilters(state) && (
        <Button variant="ghost" onClick={onClear} className="sm:ml-auto">
          <X className="size-4" aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </section>
  );
}
