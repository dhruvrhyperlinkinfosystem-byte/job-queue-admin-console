import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Link } from "react-router";
import type { Job, JobSortField, SortOrder } from "../../api/types";
import { focusRing } from "../../components/Button";
import { StatusBadge } from "../../components/StatusBadge";
import { cn } from "../../lib/cn";
import { formatDateTime } from "../../lib/format";
import { ActionButton } from "./ActionButton";

interface JobsTableProps {
  jobs: Job[];
  sort: JobSortField;
  order: SortOrder;
  onSort: (field: JobSortField) => void;
  selectedIds: ReadonlySet<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: (select: boolean) => void;
  busyIds: ReadonlySet<string>;
  onAction: (job: Pick<Job, "id" | "status">) => void;
  /** Search string of the list, so the detail page can link back to the same view. */
  returnSearch: string;
}

const cell = "px-4 py-3 text-left align-middle";

function SortHeader({
  field,
  label,
  sort,
  order,
  onSort,
}: {
  field: JobSortField;
  label: string;
  sort: JobSortField;
  order: SortOrder;
  onSort: (field: JobSortField) => void;
}) {
  const active = sort === field;
  const Icon = !active ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      className={cn(cell, "font-medium")}
      aria-sort={active ? (order === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 uppercase tracking-wide",
          focusRing,
        )}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}

export function JobsTable({
  jobs,
  sort,
  order,
  onSort,
  selectedIds,
  onToggleRow,
  onToggleAll,
  busyIds,
  onAction,
  returnSearch,
}: JobsTableProps) {
  const deadJobs = jobs.filter((job) => job.status === "dead");
  const selectedDead = deadJobs.filter((job) => selectedIds.has(job.id)).length;
  const allSelected = deadJobs.length > 0 && selectedDead === deadJobs.length;
  const sortProps = { sort, order, onSort };

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <caption className="sr-only">
          Jobs. Select dead jobs with the checkboxes to replay them together.
        </caption>
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            <th scope="col" className={cn(cell, "w-10")}>
              <input
                type="checkbox"
                aria-label="Select all dead jobs on this page"
                checked={allSelected}
                disabled={deadJobs.length === 0}
                ref={(el) => {
                  if (el) el.indeterminate = selectedDead > 0 && !allSelected;
                }}
                onChange={(event) => onToggleAll(event.target.checked)}
                className="size-4 accent-indigo-600"
              />
            </th>
            <th scope="col" className={cn(cell, "font-medium")}>
              Job ID
            </th>
            <th scope="col" className={cn(cell, "font-medium")}>
              Queue
            </th>
            <th scope="col" className={cn(cell, "font-medium")}>
              Status
            </th>
            <SortHeader field="attempts" label="Attempts" {...sortProps} />
            <SortHeader field="created_at" label="Created" {...sortProps} />
            <SortHeader field="updated_at" label="Updated" {...sortProps} />
            <th scope="col" className={cn(cell, "font-medium")}>
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <td className={cell}>
                {job.status === "dead" ? (
                  <input
                    type="checkbox"
                    aria-label={`Select ${job.id}`}
                    checked={selectedIds.has(job.id)}
                    onChange={() => onToggleRow(job.id)}
                    className="size-4 accent-indigo-600"
                  />
                ) : null}
              </td>
              <td className={cell}>
                <Link
                  to={`/jobs/${encodeURIComponent(job.id)}`}
                  state={{ returnSearch }}
                  className={cn(
                    "rounded font-mono text-[13px] font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300",
                    focusRing,
                  )}
                >
                  {job.id}
                </Link>
              </td>
              <td className={cell}>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {job.queue}
                </span>
              </td>
              <td className={cell}>
                <StatusBadge status={job.status} />
              </td>
              <td className={cell}>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums">
                    {job.attempts} / {job.max_attempts}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                  >
                    <span
                      className="block h-full rounded-full bg-slate-500 dark:bg-slate-400"
                      style={{ width: `${(job.attempts / job.max_attempts) * 100}%` }}
                    />
                  </span>
                </div>
              </td>
              <td className={cn(cell, "whitespace-nowrap text-slate-700 dark:text-slate-300")}>
                <time dateTime={job.created_at}>{formatDateTime(job.created_at)}</time>
              </td>
              <td className={cn(cell, "whitespace-nowrap text-slate-700 dark:text-slate-300")}>
                <time dateTime={job.updated_at}>{formatDateTime(job.updated_at)}</time>
              </td>
              <td className={cell}>
                <ActionButton job={job} busy={busyIds.has(job.id)} onRun={onAction} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
