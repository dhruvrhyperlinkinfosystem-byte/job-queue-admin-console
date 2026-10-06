import type { Attempt } from "../../api/types";
import { cn } from "../../lib/cn";
import { formatDateTime, formatDuration } from "../../lib/format";

const cell = "px-3 py-2 text-left align-top";

function outcomeLabel(attempt: Attempt): string {
  if (attempt.outcome === "succeeded") return "Succeeded";
  if (attempt.outcome === "failed") return "Failed";
  return "In progress";
}

export function AttemptsTable({ attempts }: { attempts: Attempt[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <caption className="sr-only">Attempts, newest first</caption>
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            {["Attempt", "Started", "Duration", "Outcome", "Error"].map((heading) => (
              <th key={heading} scope="col" className={cn(cell, "font-medium")}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
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
              <td className={cell}>{outcomeLabel(attempt)}</td>
              <td className={cell}>{attempt.error ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
