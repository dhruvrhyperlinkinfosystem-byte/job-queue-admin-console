import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import type { Attempt } from "../../api/types";
import { cn } from "../../lib/cn";
import { formatDateTime, formatDuration } from "../../lib/format";

const cell = "px-4 py-3 text-left align-top";

function outcomeLabel(attempt: Attempt): string {
  if (attempt.outcome === "succeeded") return "Succeeded";
  if (attempt.outcome === "failed") return "Failed";
  return "In progress";
}

function OutcomeCell({ attempt }: { attempt: Attempt }) {
  const Icon =
    attempt.outcome === "succeeded"
      ? CircleCheck
      : attempt.outcome === "failed"
        ? CircleX
        : LoaderCircle;
  const tone =
    attempt.outcome === "succeeded"
      ? "text-green-700 dark:text-green-300"
      : attempt.outcome === "failed"
        ? "text-amber-700 dark:text-amber-300"
        : "text-blue-700 dark:text-blue-300";
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium", tone)}>
      <Icon className="size-4" aria-hidden="true" />
      {outcomeLabel(attempt)}
    </span>
  );
}

export function AttemptsTable({ attempts }: { attempts: Attempt[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <caption className="sr-only">Attempts, newest first</caption>
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            {["Attempt", "Started", "Duration", "Outcome", "Error"].map((heading) => (
              <th key={heading} scope="col" className={cn(cell, "font-medium")}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {attempts.map((attempt) => (
            <tr key={attempt.number}>
              <td className={cn(cell, "tabular-nums")}>#{attempt.number}</td>
              <td className={cn(cell, "whitespace-nowrap")}>
                <time dateTime={attempt.started_at}>{formatDateTime(attempt.started_at)}</time>
              </td>
              <td className={cn(cell, "tabular-nums")}>
                {attempt.finished_at
                  ? formatDuration(attempt.started_at, attempt.finished_at)
                  : "–"}
              </td>
              <td className={cell}>
                <OutcomeCell attempt={attempt} />
              </td>
              <td className={cell}>{attempt.error ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
